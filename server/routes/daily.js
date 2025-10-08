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
  voteComment,
} from "../controllers/DailyController.js";

const router = express.Router();
const JWT_SECRET = config.JWT_SECRET;

/**
 * parseTokenFromReq
 * Accepts: Authorization: Bearer <token>, raw token header, or cookie token
 */
function parseTokenFromReq(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && typeof auth === "string") {
    if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
    return auth.trim();
  }
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

/**
 * requireAuth
 * - Logs token presence and verification result for debugging
 */
export function requireAuth(req, res, next) {
  const token = parseTokenFromReq(req);
  console.log("[requireAuth] incoming:", req.method, req.originalUrl, "tokenPresent:", !!token);
  if (!token) {
    console.warn("[requireAuth] missing token for", req.method, req.originalUrl);
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!JWT_SECRET) {
    console.error("[requireAuth] JWT_SECRET not configured on server");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Trim surrounding quotes if present (some clients send quoted strings)
  let cleaned = token;
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);

  try {
    const payload = jwt.verify(cleaned, JWT_SECRET);
    console.log("[requireAuth] token verified payload:", { id: payload.id, email: payload.email, iat: payload.iat, exp: payload.exp });
    req.user = payload;
    return next();
  } catch (err) {
    console.warn("[requireAuth] token verify failed:", err && err.name, err && err.message);
    if (err && err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * optionalAuth
 * - Attempts to parse token and attach req.user, but never fails the request.
 */
export function optionalAuth(req, res, next) {
  const token = parseTokenFromReq(req);
  if (!token) return next();
  if (!JWT_SECRET) {
    console.error("[optionalAuth] JWT_SECRET not configured on server");
    return next();
  }

  let cleaned = token;
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);

  try {
    const payload = jwt.verify(cleaned, JWT_SECRET);
    console.log("[optionalAuth] token OK for", req.method, req.originalUrl, "user:", payload?.email || payload?.id);
    req.user = payload;
  } catch (err) {
    // ignore verification errors for optional auth, but log for debugging
    console.warn("[optionalAuth] token verify failed (ignoring):", err && err.name, err && err.message);
  }
  return next();
}

// Routes
router.get("/today", optionalAuth, getToday);
router.get("/section/:date/:sectionKey", requireAuth, getSectionProblems);
router.post("/submit", requireAuth, submitAttempt);
router.get("/leaderboard", optionalAuth, getDailyLeaderboard);
router.get("/season", optionalAuth, getSeasonLeaderboard);
router.get("/streak", requireAuth, getMyStreak);
router.post("/comment", requireAuth, postComment);
router.post("/comment/vote", requireAuth, voteComment);
router.get("/comments", optionalAuth, getComments);

export default router;
