import Contest from "../models/Contest.js";
import ContestAttempt from "../models/ContestAttempt.js";
import User from "../models/User.js";
import generateQuestions from "../utils/questionGenerator.js";
import { sendImmediateContestNotification } from "../utils/contestScheduler.js";

// Get next upcoming contest
export async function getNextContest(req, res) {
  try {
    const now = new Date();
    const contest = await Contest.findOne({ 
      closeTime: { $gt: now } 
    })
    .sort({ openTime: 1 })
    .populate('registeredUsers', 'name email');
    
    if (!contest) {
      return res.json({ contest: null, message: "No upcoming contests" });
    }

    // Update contest status based on current time
    if (contest.isLive && contest.status !== 'live') {
      contest.status = 'live';
      await contest.save();
    } else if (contest.isCompleted && contest.status !== 'completed') {
      contest.status = 'completed';
      await contest.save();
    }

    res.json({ contest });
  } catch (error) {
    console.error("Error fetching next contest:", error);
    res.status(500).json({ error: "Failed to fetch contest" });
  }
}

// Get current live contest
export async function getCurrentContest(req, res) {
  try {
    const now = new Date();
    const contest = await Contest.findOne({
      openTime: { $lte: now },
      closeTime: { $gt: now },
      status: 'live'
    });

    if (!contest) {
      return res.json({ contest: null, message: "No live contest" });
    }

    res.json({ contest });
  } catch (error) {
    console.error("Error fetching current contest:", error);
    res.status(500).json({ error: "Failed to fetch current contest" });
  }
}

// Register for contest
export async function registerForContest(req, res) {
  try {
    const { contestId } = req.body;
    const userId = req.user.id;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    if (contest.isCompleted) {
      return res.status(400).json({ error: "Contest has already ended" });
    }

    if (contest.registeredUsers.length >= contest.maxParticipants) {
      return res.status(400).json({ error: "Contest is full" });
    }

    if (!contest.registeredUsers.includes(userId)) {
      contest.registeredUsers.push(userId);
      await contest.save();
      
      // Send immediate email notification if user registers close to contest time
      const user = await User.findById(userId).select('name email');
      if (user && user.email) {
        const now = new Date();
        const contestStart = new Date(contest.openTime);
        const minutesUntilStart = Math.floor((contestStart - now) / (1000 * 60));
        
        // Send immediate email if contest is within 15 minutes or already live
        if (minutesUntilStart <= 15) {
          await sendImmediateContestNotification(contest, user);
        }
      }
    }

    res.json({ success: true, message: "Successfully registered for contest" });
  } catch (error) {
    console.error("Error registering for contest:", error);
    res.status(500).json({ error: "Failed to register for contest" });
  }
}

// Start contest attempt
export async function startContestAttempt(req, res) {
  try {
    const { contestId } = req.body;
    const userId = req.user.id;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    if (!contest.isLive) {
      return res.status(400).json({ error: "Contest is not currently live" });
    }

    // Check if user is registered
    if (!contest.registeredUsers.includes(userId)) {
      return res.status(403).json({ error: "You must register for the contest first" });
    }

    // Check if user already has an attempt
    const existingAttempt = await ContestAttempt.findOne({ contestId, userId });
    if (existingAttempt) {
      return res.json({ 
        attempt: existingAttempt, 
        questions: contest.questions.map(q => ({ question: q.question, points: q.points }))
      });
    }

    // Create new attempt
    const attempt = new ContestAttempt({
      contestId,
      userId,
      startedAt: new Date()
    });

    await attempt.save();

    // Return questions without answers
    const questions = contest.questions.map(q => ({ 
      question: q.question, 
      points: q.points 
    }));

    res.json({ attempt, questions });
  } catch (error) {
    console.error("Error starting contest attempt:", error);
    res.status(500).json({ error: "Failed to start contest attempt" });
  }
}

// Submit answer for a question
export async function submitAnswer(req, res) {
  try {
    const { contestId, questionIndex, answer, timeSpent } = req.body;
    const userId = req.user.id;

    const contest = await Contest.findById(contestId);
    if (!contest || !contest.isLive) {
      return res.status(400).json({ error: "Contest is not live" });
    }

    const attempt = await ContestAttempt.findOne({ contestId, userId });
    if (!attempt) {
      return res.status(404).json({ error: "Contest attempt not found" });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: "Contest attempt is not in progress" });
    }

    const question = contest.questions[questionIndex];
    if (!question) {
      return res.status(400).json({ error: "Invalid question index" });
    }

    const isCorrect = answer === question.answer;
    const points = isCorrect ? question.points : 0;

    // Check if answer already exists for this question
    const existingAnswerIndex = attempt.answers.findIndex(a => a.questionIndex === questionIndex);
    
    const answerData = {
      questionIndex,
      userAnswer: answer,
      correctAnswer: question.answer,
      isCorrect,
      timeSpent: timeSpent || 0,
      points
    };

    if (existingAnswerIndex >= 0) {
      // Update existing answer
      attempt.answers[existingAnswerIndex] = answerData;
    } else {
      // Add new answer
      attempt.answers.push(answerData);
    }

    await attempt.save();

    res.json({ 
      success: true, 
      isCorrect, 
      points,
      correctAnswer: question.answer,
      totalScore: attempt.totalScore
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ error: "Failed to submit answer" });
  }
}

// Submit final contest attempt
export async function submitContestAttempt(req, res) {
  try {
    const { contestId } = req.body;
    const userId = req.user.id;

    const attempt = await ContestAttempt.findOne({ contestId, userId });
    if (!attempt) {
      return res.status(404).json({ error: "Contest attempt not found" });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: "Contest attempt is not in progress" });
    }

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    
    // Award badges based on performance
    const badges = [];
    if (attempt.correctCount >= 18) badges.push('contest-master');
    else if (attempt.correctCount >= 15) badges.push('contest-expert');
    else if (attempt.correctCount >= 10) badges.push('contest-advanced');
    else if (attempt.correctCount >= 5) badges.push('contest-intermediate');
    else if (attempt.correctCount > 0) badges.push('contest-participant');

    attempt.badges = badges;
    await attempt.save();

    // Update user badges
    if (badges.length > 0) {
      await User.findByIdAndUpdate(userId, { 
        $addToSet: { badges: { $each: badges } } 
      });
    }

    res.json({ 
      success: true, 
      attempt,
      message: "Contest submitted successfully",
      badges
    });
  } catch (error) {
    console.error("Error submitting contest attempt:", error);
    res.status(500).json({ error: "Failed to submit contest attempt" });
  }
}

// Get contest leaderboard
export async function getContestLeaderboard(req, res) {
  try {
    const { contestId, limit = 50 } = req.query;

    const leaderboard = await ContestAttempt.find({ 
      contestId,
      status: { $in: ['submitted', 'timeout'] }
    })
    .populate('userId', 'name email')
    .sort({ 
      totalScore: -1, 
      totalTimeSpent: 1,
      submittedAt: 1 
    })
    .limit(parseInt(limit));

    // Calculate ranks and percentiles
    const totalParticipants = leaderboard.length;
    const rankedLeaderboard = leaderboard.map((attempt, index) => ({
      ...attempt.toObject(),
      rank: index + 1,
      percentile: totalParticipants > 0 ? Math.round(((totalParticipants - index) / totalParticipants) * 100) : 0
    }));

    res.json({ leaderboard: rankedLeaderboard, totalParticipants });
  } catch (error) {
    console.error("Error fetching contest leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}


// Create contest (admin function)
export async function createContest({ openAt, durationMinutes = 180, questionCount = 20, title = "Weekly Math Contest" }) {
  try {
    const closeAt = new Date(openAt.getTime() + durationMinutes * 60 * 1000);
    
    // Generate questions
    const questions = generateQuestions(questionCount).map((q, index) => ({
      question: q.question,
      answer: q.answer,
      difficulty: index < 5 ? 'easy' : index < 15 ? 'medium' : 'hard',
      points: index < 5 ? 1 : index < 15 ? 2 : 3
    }));

    const contest = new Contest({
      title,
      description: `${title} - ${questionCount} questions in ${durationMinutes} minutes`,
      openTime: openAt,
      closeTime: closeAt,
      duration: durationMinutes * 60,
      questions,
      registeredUsers: [],
      status: 'upcoming'
    });

    await contest.save();
    console.log(`Contest created: ${contest._id} at ${openAt}`);
    return contest;
  } catch (error) {
    console.error("Error creating contest:", error);
    throw error;
  }
}

// Get contest statistics
export async function getContestStats(req, res) {
  try {
    const { contestId } = req.query;
    
    if (!contestId) {
      return res.status(400).json({ error: "Contest ID is required" });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    const totalRegistered = contest.registeredUsers.length;
    const totalAttempts = await ContestAttempt.countDocuments({ 
      contestId,
      status: { $in: ['submitted', 'timeout'] }
    });

    const stats = {
      totalRegistered,
      totalAttempts,
      participationRate: totalRegistered > 0 ? (totalAttempts / totalRegistered * 100).toFixed(1) : 0
    };

    res.json({ stats });
  } catch (error) {
    console.error("Error getting contest stats:", error);
    res.status(500).json({ error: "Failed to get contest stats" });
  }
}

// Get user's contest history and progress
export async function getUserContestHistory(req, res) {
  try {
    const userId = req.user.id;
    
    // Get all user's contest attempts with contest details
    const attempts = await ContestAttempt.find({ 
      userId,
      status: { $in: ['submitted', 'timeout'] }
    })
    .populate('contestId', 'title openTime closeTime questions')
    .sort({ submittedAt: -1 })
    .lean();

    // Calculate performance metrics for each attempt
    const history = attempts.map(attempt => {
      const contest = attempt.contestId;
      const totalQuestions = contest.questions.length;
      const correctAnswers = attempt.answers.filter(ans => ans.isCorrect).length;
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(1) : 0;
      const totalTime = attempt.answers.reduce((sum, ans) => sum + (ans.timeSpent || 0), 0);
      
      return {
        contestId: contest._id,
        contestTitle: contest.title,
        contestDate: contest.openTime,
        score: attempt.score || 0,
        correctAnswers,
        totalQuestions,
        accuracy: parseFloat(accuracy),
        totalTime,
        rank: attempt.rank || null,
        badges: attempt.badges || [],
        submittedAt: attempt.submittedAt
      };
    });

    // Calculate overall statistics
    const totalContests = history.length;
    const totalScore = history.reduce((sum, h) => sum + h.score, 0);
    const avgScore = totalContests > 0 ? (totalScore / totalContests).toFixed(1) : 0;
    const avgAccuracy = totalContests > 0 ? 
      (history.reduce((sum, h) => sum + h.accuracy, 0) / totalContests).toFixed(1) : 0;
    const bestScore = totalContests > 0 ? Math.max(...history.map(h => h.score)) : 0;
    const bestRank = totalContests > 0 ? Math.min(...history.filter(h => h.rank).map(h => h.rank)) : null;
    
    // Get all unique badges earned
    const allBadges = [...new Set(history.flatMap(h => h.badges))];

    const progressData = {
      totalContests,
      avgScore: parseFloat(avgScore),
      avgAccuracy: parseFloat(avgAccuracy),
      bestScore,
      bestRank,
      totalBadges: allBadges.length,
      badges: allBadges,
      history
    };

    res.json({ progress: progressData });
  } catch (error) {
    console.error("Error getting user contest history:", error);
    res.status(500).json({ error: "Failed to get contest history" });
  }
}

// Get detailed past contest with questions and user's answers
export async function getPastContestDetails(req, res) {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;

    // Get contest details
    const contest = await Contest.findById(contestId).lean();
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    // Get user's attempt for this contest
    const attempt = await ContestAttempt.findOne({ 
      contestId, 
      userId,
      status: { $in: ['submitted', 'timeout'] }
    }).lean();

    if (!attempt) {
      return res.status(404).json({ error: "No attempt found for this contest" });
    }

    // Prepare questions with user's answers
    const questionsWithAnswers = contest.questions.map((question, index) => {
      const userAnswer = attempt.answers[index];
      return {
        questionNumber: index + 1,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        difficulty: question.difficulty,
        userAnswer: userAnswer?.answer || null,
        isCorrect: userAnswer?.isCorrect || false,
        timeSpent: userAnswer?.timeSpent || 0,
        explanation: question.explanation || null
      };
    });

    const contestDetails = {
      contest: {
        id: contest._id,
        title: contest.title,
        openTime: contest.openTime,
        closeTime: contest.closeTime,
        duration: contest.duration,
        status: contest.status
      },
      attempt: {
        score: attempt.score,
        rank: attempt.rank,
        correctAnswers: attempt.answers.filter(ans => ans.isCorrect).length,
        totalQuestions: contest.questions.length,
        totalTime: attempt.answers.reduce((sum, ans) => sum + (ans.timeSpent || 0), 0),
        badges: attempt.badges || [],
        submittedAt: attempt.submittedAt
      },
      questions: questionsWithAnswers
    };

    res.json({ contestDetails });
  } catch (error) {
    console.error("Error getting past contest details:", error);
    res.status(500).json({ error: "Failed to get contest details" });
  }
}
