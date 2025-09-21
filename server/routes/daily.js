// server/routes/daily.js
import express from "express";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import {
  getToday,
  getSectionProblems,
  submitAttempt,
  getDailyLeaderboard,
  getSeasonLeaderboard,
  getMyStreak,
  postComment,
  getComments,
} from "../controllers/DailyController.js";

const router = express.Router();
const JWT_SECRET = config.JWT_SECRET;

function parseTokenFromReq(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && typeof auth === "string") {
    if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
    return auth.trim();
  }
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

export function requireAuth(req, res, next) {
  const token = parseTokenFromReq(req);
  if (!token) {
    console.warn("[requireAuth] missing token for", req.method, req.originalUrl);
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!JWT_SECRET) {
    console.error("[requireAuth] JWT_SECRET not configured on server");
    return res.status(500).json({ error: "Server configuration error" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    console.warn("[requireAuth] token verify failed:", err.name, err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req, res, next) {
  const token = parseTokenFromReq(req);
  if (!token) return next();
  if (!JWT_SECRET) {
    console.error("[optionalAuth] JWT_SECRET not configured on server");
    return next();
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // ignore verification errors for optional auth, but log for debugging
    console.warn("[optionalAuth] token verify failed (ignoring):", err.name, err.message);
  }
  return next();
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
