// server/controllers/DailyController.js
import DailyProblem from "../models/DailyProblem.js";
import DailyAttempt from "../models/DailyAttempt.js";
import DailyComment from "../models/DailyComment.js";
import Season from "../models/Season.js";
import User from "../models/User.js";
import { createDailyProblemsForDate } from "../utils/dailyGenerator.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import mongoose from "mongoose";
dayjs.extend(utc);

// Scoring constants
const SCORE_CORRECT = 10;
const SCORE_WRONG = -5;
const MAX_TIME_BONUS = 10;

// Gating
const minRatingBySection = {
  basic: 0,
  intermediate: 1600,
  advanced: 1800,
  elite: 1900,
};

// Normalize userId
function getReqUserId(req) {
  return req.user?.id || req.user?._id || null;
}

// ---------------- TODAY ----------------
export async function getToday(req, res) {
  try {
    const dateStr = dayjs().utc().format("YYYY-MM-DD");
    let daily = await DailyProblem.findOne({ date: dateStr }).lean();

    if (!daily) {
      const payload = createDailyProblemsForDate(dateStr);
      daily = await DailyProblem.create(payload);
    }

    const rating = req.user?.rating ?? 0;
    const sections = daily.sections.map((s) => ({
      key: s.key,
      title: s.title,
      unlocked: rating >= (minRatingBySection[s.key] ?? 0),
      count: s.problems.length,
    }));

    res.json({ date: daily.date, sections });
  } catch (err) {
    console.error("Daily getToday error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ---------------- SECTION ----------------
export async function getSectionProblems(req, res) {
  try {
    const { date, sectionKey } = req.params;
    const daily = await DailyProblem.findOne({ date }).lean();
    if (!daily) return res.status(404).json({ error: "Daily problems not found" });

    const section = daily.sections.find((s) => s.key === sectionKey);
    if (!section) return res.status(404).json({ error: "Section not found" });

    const rating = req.user?.rating ?? 0;
    if (rating < (minRatingBySection[sectionKey] ?? 0)) {
      return res.status(403).json({ error: "Section locked" });
    }

    res.json({ date, sectionKey, questions: section.problems.map((p) => p.question) });
  } catch (err) {
    console.error("Daily getSectionProblems error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ---------------- SUBMIT ATTEMPT ----------------
export async function submitAttempt(req, res) {
  try {
    const userIdRaw = getReqUserId(req);
    if (!userIdRaw) return res.status(401).json({ error: "Not authenticated" });

    const userId = (typeof userIdRaw === "string" && mongoose.Types.ObjectId.isValid(userIdRaw))
      ? new mongoose.Types.ObjectId(userIdRaw)
      : userIdRaw;

    const { date, sectionKey, answers } = req.body;
    if (!date || !sectionKey || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const exists = await DailyAttempt.findOne({ userId, date, sectionKey });
    if (exists) return res.status(403).json({ error: "Already attempted" });

    const daily = await DailyProblem.findOne({ date }).lean();
    if (!daily) return res.status(404).json({ error: "Daily problems not found" });

    const section = daily.sections.find((s) => s.key === sectionKey);
    if (!section) return res.status(404).json({ error: "Section not found" });

    // Check rating gate
    const rating = req.user?.rating ?? 0;
    if (rating < (minRatingBySection[sectionKey] ?? 0)) {
      return res.status(403).json({ error: "Section locked" });
    }

    // Evaluate answers
    let correct = 0, wrong = 0, totalTimeMs = 0;
    for (let i = 0; i < section.problems.length; i++) {
      const p = section.problems[i];
      const ansObj = answers[i] || {};
      if (Number(ansObj.answer) === Number(p.answer)) correct++;
      else wrong++;
      totalTimeMs += Number(ansObj.timeMs || 0);
    }

    const baseScore = correct * SCORE_CORRECT + wrong * SCORE_WRONG;
    const expectedTimeMs = section.problems.length * 15000;
    const timeBonus = totalTimeMs < expectedTimeMs
      ? Math.round(MAX_TIME_BONUS * (1 - totalTimeMs / expectedTimeMs))
      : 0;

    const accuracy = Math.round((correct / section.problems.length) * 100);
    const practicePoints = Math.max(0, baseScore + timeBonus);

    // Save attempt
    const attempt = await DailyAttempt.create({
      userId,
      date,
      sectionKey,
      score: baseScore,
      correctCount: correct,
      wrongCount: wrong,
      timeTakenSeconds: Math.round(totalTimeMs / 1000),
      accuracy,
      timeBonus,
      practicePoints,
    });

    // Season points update
    let season = await Season.currentSeason();
    if (!season) {
      const now = dayjs().utc();
      season = { year: now.year(), month: now.month() + 1 };
    }
    const seasonKey = `${season.year}-${String(season.month).padStart(2, "0")}`;

    const updateOps = {};
    if (practicePoints) {
      updateOps.$inc = {
        totalPracticePoints: practicePoints,
        [`seasonPoints.${seasonKey}`]: practicePoints,
      };
    }

    // Streak
    const yesterday = dayjs(date).utc().subtract(1, "day").format("YYYY-MM-DD");
    const hadYesterday = await DailyAttempt.findOne({ userId, date: yesterday });
    if (hadYesterday) {
      updateOps.$inc = { ...(updateOps.$inc || {}), currentStreak: 1 };
    } else {
      updateOps.$set = { ...(updateOps.$set || {}), currentStreak: 1 };
    }
    updateOps.$set = { ...(updateOps.$set || {}), lastDailyAt: new Date() };

    const updated = await User.findByIdAndUpdate(userId, updateOps, { new: true }).lean();

    const badges = [];
    if (updated?.currentStreak >= 7 && !updated.badges?.includes("streak-7")) badges.push("streak-7");
    if (updated?.currentStreak >= 30 && !updated.badges?.includes("streak-30")) badges.push("streak-30");
    if (updated?.currentStreak >= 100 && !updated.badges?.includes("streak-100")) badges.push("streak-100");
    if (badges.length) {
      await User.findByIdAndUpdate(userId, { $addToSet: { badges: { $each: badges } } });
    }

    res.json({ attempt, practicePoints, awardedBadges: badges });
  } catch (err) {
    console.error("Daily submitAttempt error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ---------------- DAILY LEADERBOARD ----------------
export async function getDailyLeaderboard(req, res) {
  try {
    const { date, sectionKey } = req.query;
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const top = await DailyAttempt.aggregate([
      { $match: { date, sectionKey } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { practicePoints: 1, timeTakenSeconds: 1, "user.name": 1, "user._id": 1 } },
      { $sort: { practicePoints: -1, timeTakenSeconds: 1 } },
      { $limit: limit },
    ]);

    res.json({ top });
  } catch (err) {
    console.error("Daily getDailyLeaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ---------------- SEASON LEADERBOARD ----------------
export async function getSeasonLeaderboard(req, res) {
  try {
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const month = Number(req.query.month) || new Date().getUTCMonth() + 1;
    const seasonKey = `${year}-${String(month).padStart(2, "0")}`;

    const top = await User.aggregate([
      { $project: { name: 1, rating: 1, seasonPoints: { $ifNull: [`$seasonPoints.${seasonKey}`, 0] } } },
      { $sort: { seasonPoints: -1 } },
      { $limit: 50 },
    ]);

    res.json({ top });
  } catch (err) {
    console.error("Daily getSeasonLeaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ---------------- STREAK ----------------
export async function getMyStreak(req, res) {
  try {
    const userIdRaw = getReqUserId(req);
    if (!userIdRaw) return res.status(401).json({ error: "Not authenticated" });

    const userId = (typeof userIdRaw === "string" && mongoose.Types.ObjectId.isValid(userIdRaw))
      ? new mongoose.Types.ObjectId(userIdRaw)
      : userIdRaw;

    const u = await User.findById(userId).lean();
    const currentStreak = u?.currentStreak || 0;
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayjs().utc().subtract(i, "day").format("YYYY-MM-DD");
      const attempt = await DailyAttempt.findOne({ userId, date: d }).lean();
      days.push({ date: d, solved: !!attempt });
    }
    res.json({ currentStreak, days });
  } catch (err) {
    console.error("Daily getMyStreak error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ---------------- COMMENTS ----------------
export async function postComment(req, res) {
  try {
    const userIdRaw = getReqUserId(req);
    if (!userIdRaw) return res.status(401).json({ error: "Not authenticated" });

    const userId = (typeof userIdRaw === "string" && mongoose.Types.ObjectId.isValid(userIdRaw))
      ? new mongoose.Types.ObjectId(userIdRaw)
      : userIdRaw;

    const { date, sectionKey, text } = req.body;
    if (!date || !sectionKey || !text) return res.status(400).json({ error: "Missing fields" });

    const comment = await DailyComment.create({ date, sectionKey, userId, text });
    const user = await User.findById(userId).select("name").lean();
    res.json({ comment: { _id: comment._id, date, sectionKey, text, createdAt: comment.createdAt, user: { _id: userId, name: user?.name || "Unknown" } } });
  } catch (err) {
    console.error("Daily postComment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getComments(req, res) {
  try {
    const { date, sectionKey, limit = 50 } = req.query;
    if (!date || !sectionKey) return res.status(400).json({ error: "Missing fields" });

    const rows = await DailyComment.aggregate([
      { $match: { date, sectionKey } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { 
        $project: { 
          text: 1, 
          createdAt: 1, 
          updatedAt: 1,
          votes: 1,
          upvotes: 1,
          downvotes: 1,
          voteScore: 1,
          "user.name": 1, 
          "user._id": 1,
          "user.avatar": 1
        } 
      },
      { $sort: { voteScore: -1, createdAt: -1 } },
      { $limit: Number(limit) },
    ]);
    
    // Add user's vote status if authenticated
    const userId = getReqUserId(req);
    if (userId) {
      const userVotes = await DailyComment.aggregate([
        { $match: { date, sectionKey, 'votes.userId': mongoose.Types.ObjectId(userId) } },
        { $project: { _id: 1, 'votes': { $filter: { input: '$votes', as: 'vote', cond: { $eq: ['$$vote.userId', mongoose.Types.ObjectId(userId)] } } } } },
        { $unwind: '$votes' },
        { $project: { _id: 1, voteType: '$votes.voteType' } }
      ]);

      const voteMap = userVotes.reduce((acc, { _id, voteType }) => ({
        ...acc,
        [_id.toString()]: voteType
      }), {});

      rows.forEach(comment => {
        comment.userVote = voteMap[comment._id.toString()] || null;
      });
    }

    res.json({ comments: rows });
  } catch (err) {
    console.error("Daily getComments error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function voteComment(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { commentId, voteType } = req.body;
    if (!commentId || !['up', 'down'].includes(voteType)) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const comment = await DailyComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user is the comment author
    if (comment.userId.toString() === userId.toString()) {
      return res.status(400).json({ error: "Cannot vote on your own comment" });
    }

    // Find existing vote
    const existingVoteIndex = comment.votes.findIndex(v => 
      v.userId.toString() === userId.toString()
    );

    // If same vote type, remove the vote (toggle off)
    if (existingVoteIndex !== -1) {
      const existingVote = comment.votes[existingVoteIndex];
      if (existingVote.voteType === voteType) {
        comment.votes.splice(existingVoteIndex, 1);
      } else {
        // Change vote type
        comment.votes[existingVoteIndex].voteType = voteType;
        comment.votes[existingVoteIndex].createdAt = new Date();
      }
    } else {
      // Add new vote
      comment.votes.push({
        userId,
        voteType,
        createdAt: new Date()
      });
    }

    // Save the comment (this will trigger the pre-save hook to update counts)
    await comment.save();

    // Return the updated comment with vote counts
    res.json({
      success: true,
      comment: {
        _id: comment._id,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        voteScore: comment.voteScore
      }
    });

  } catch (err) {
    console.error("Error voting on comment:", err);
    res.status(500).json({ error: "Server error" });
  }
}
