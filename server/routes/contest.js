import express from "express";
import config from "../config/index.js";
import jwt from "jsonwebtoken";
import {
  getNextContest,
  getCurrentContest,
  registerForContest,
  startContestAttempt,
  submitAnswer,
  submitContestAttempt,
  getContestLeaderboard,
  getContestStats,
  getUserContestHistory,
  getPastContestDetails
} from "../controllers/ContestController.js";

const router = express.Router();
const JWT_SECRET = config.JWT_SECRET;

// Parse token from request
function parseTokenFromReq(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && typeof auth === "string") {
    if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
    return auth.trim();
  }
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

// Require authentication middleware
function requireAuth(req, res, next) {
  const token = parseTokenFromReq(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Optional authentication middleware
function optionalAuth(req, res, next) {
  const token = parseTokenFromReq(req);
  if (!token) return next();
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
  } catch (err) {
    // Ignore invalid tokens for optional auth
  }
  return next();
}

// Public routes
router.get("/next", optionalAuth, getNextContest);
router.get("/current", optionalAuth, getCurrentContest);
router.get("/leaderboard", optionalAuth, getContestLeaderboard);
router.get("/stats", optionalAuth, getContestStats);

// Protected routes (require authentication)
router.post("/register", requireAuth, registerForContest);
router.post("/start", requireAuth, startContestAttempt);
router.post("/submit-answer", requireAuth, submitAnswer);
router.post("/submit", requireAuth, submitContestAttempt);
router.get("/history", requireAuth, getUserContestHistory);
router.get("/past/:contestId", requireAuth, getPastContestDetails);

export default router;
