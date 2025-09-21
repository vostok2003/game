// server/routes/daily.js
import express from "express";
import { getToday, getSectionProblems, submitAttempt, getDailyLeaderboard, getSeasonLeaderboard, getMyStreak, postComment, getComments } from "../controllers/DailyController.js";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

const router = express.Router();
const JWT_SECRET = config.JWT_SECRET;

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

router.get("/today", optionalAuth, getToday);
router.get("/section/:date/:sectionKey", requireAuth, getSectionProblems);
router.post("/submit", requireAuth, submitAttempt);
router.get("/leaderboard", optionalAuth, getDailyLeaderboard);
router.get("/season", optionalAuth, getSeasonLeaderboard);
router.get("/streak", requireAuth, getMyStreak);
router.post("/comment", requireAuth, postComment);
router.get("/comments", optionalAuth, getComments);

export default router;
