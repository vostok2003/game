// server/routes/leaderboard.js
import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET /api/leaderboard
router.get("/", async (req, res) => {
  try {
    const top = await User.find()
      .sort({ rating: -1 })
      .limit(100)
      .select("name rating rd")
      .lean();

    res.json({ top });
  } catch (err) {
    console.error("❌ Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
