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

/**
 * GET /api/daily/today
 * Public-ish: returns sections and whether unlocked for current user (optional auth)
 */
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

/**
 * GET /api/daily/section/:date/:sectionKey
 * require auth
 */
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

    // Return questions without answers (client user must be authenticated to attempt)
    res.json({ date, sectionKey, questions: section.problems.map((p) => p.question) });
  } catch (err) {
    console.error("Daily getSectionProblems error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/**
 * POST /api/daily/submit
 * Body: { date, sectionKey, answers: [{answer, timeMs}, ...] }
 * Auth required.
 */
export async function submitAttempt(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { date, sectionKey, answers } = req.body;
    if (!date || !sectionKey || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // One attempt per user per date+section
    const exists = await DailyAttempt.findOne({ userId, date, sectionKey });
    if (exists) return res.status(403).json({ error: "Already attempted" });

    const daily = await DailyProblem.findOne({ date }).lean();
    if (!daily) return res.status(404).json({ error: "Daily problems not found" });
    const section = daily.sections.find((s) => s.key === sectionKey);
    if (!section) return res.status(404).json({ error: "Section not found" });

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
    const expectedTimeMs = section.problems.length * 15000; // baseline 15s per problem
    const timeBonus = totalTimeMs < expectedTimeMs
      ? Math.round(MAX_TIME_BONUS * (1 - totalTimeMs / expectedTimeMs))
      : 0;

    const accuracy = Math.round((correct / section.problems.length) * 100);
    const practicePoints = Math.max(0, baseScore + timeBonus);

    // Persist attempt
    const attempt = await DailyAttempt.create({
      userId: mongoose.Types.ObjectId(userId),
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

    // Update user's monthly season tally & streak:
    // increment a practicePointsSeason field (non-breaking addition)
    const season = await Season.currentSeason();
    const seasonKey = season ? `${season.year}-${season.month}` : null;

    const userUpdate = {};
    if (practicePoints) {
      // keep totalPractice optional field
      userUpdate.$inc = { totalPracticePoints: practicePoints };
      if (seasonKey) {
        userUpdate.$inc[`seasonPoints.${seasonKey}`] = practicePoints;
      }
    }

    // Handle streaks: check last attempt date for this user (any section)
    const yesterday = dayjs(date).utc().subtract(1, "day").format("YYYY-MM-DD");
    const hadYesterday = await DailyAttempt.findOne({ userId, date: yesterday });
    const hadToday = true; // just submitted
    if (hadYesterday) {
      // continue streak
      userUpdate.$inc = { ...(userUpdate.$inc || {}), currentStreak: 1 };
      userUpdate.$set = { ...(userUpdate.$set || {}), lastDailyAt: new Date() };
    } else {
      // starting a new streak or broken streak -> recalc
      userUpdate.$set = { ...(userUpdate.$set || {}), currentStreak: 1, lastDailyAt: new Date() };
    }

    // atomic update
    try {
      const updated = await User.findByIdAndUpdate(userId, userUpdate, { new: true }).lean();
      // Optionally award badges (simple thresholds)
      const badges = [];
      if (updated.currentStreak >= 7) badges.push("streak-7");
      if (updated.currentStreak >= 30) badges.push("streak-30");
      if (updated.currentStreak >= 100) badges.push("streak-100");
      // store awarded badges as separate collection / field later — for now include in response
      res.json({ attempt, awardedBadges: badges, practicePoints });
    } catch (err) {
      console.warn("Daily submit: failed to update user streak/points", err);
      res.json({ attempt, practicePoints });
    }
  } catch (err) {
    console.error("Daily submitAttempt error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/**
 * GET /api/daily/leaderboard?date=YYYY-MM-DD&sectionKey=basic
 * returns top practicePoints sorted, tie-broken by lower timeTakenSeconds
 */
export async function getDailyLeaderboard(req, res) {
  try {
    const { date, sectionKey } = req.query;
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const top = await DailyAttempt.aggregate([
      { $match: { date, sectionKey } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { practicePoints: 1, timeTakenSeconds: 1, correctCount: 1, wrongCount: 1, accuracy: 1, "user.name": 1, "user._id": 1 } },
      { $sort: { practicePoints: -1, timeTakenSeconds: 1 } },
      { $limit: limit },
    ]);

    res.json({ top });
  } catch (err) {
    console.error("Daily getDailyLeaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/**
 * GET /api/daily/season?year=YYYY&month=MM
 * returns aggregated season leaderboard
 */
export async function getSeasonLeaderboard(req, res) {
  try {
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const month = Number(req.query.month) || new Date().getUTCMonth() + 1;
    const seasonKey = `${year}-${month}`;

    // aggregate seasonPoints from users (stored in seasonPoints map)
    const top = await User.aggregate([
      { $project: { name: 1, rating: 1, seasonPoints: { $ifNull: ["$seasonPoints." + seasonKey, 0] } } },
      { $sort: { seasonPoints: -1 } },
      { $limit: 50 },
    ]);

    res.json({ top });
  } catch (err) {
    console.error("Daily getSeasonLeaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/**
 * GET /api/daily/streak (auth)
 */
export async function getMyStreak(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const u = await User.findById(userId).lean();
    const currentStreak = u?.currentStreak || 0;
    // Build last 30 days map of solved/not solved
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

/**
 * Discussion: GET/POST comments
 */
export async function postComment(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { date, sectionKey, text } = req.body;
    if (!date || !sectionKey || !text) return res.status(400).json({ error: "Missing fields" });
    const comment = await DailyComment.create({ date, sectionKey, userId, text });
    // populate name
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
      { $project: { text: 1, createdAt: 1, "user.name": 1, "user._id": 1 } },
      { $sort: { createdAt: -1 } },
      { $limit: Number(limit) },
    ]);
    res.json({ comments: rows });
  } catch (err) {
    console.error("Daily getComments error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
