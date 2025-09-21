// server/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    // Keep password required for local signup; OAuth users will get a random hashed password.
    password: { type: String, required: true },

    // OAuth metadata
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, required: false },

    score: { type: Number, default: 0 },

    // Rating fields for Glicko-2 / Elo
    rating: { type: Number, default: 1500 },
    rd: { type: Number, default: 350 },
    volatility: { type: Number, default: 0.06 },
    lastRatedAt: { type: Date, default: Date.now },

    // Practice / season tracking
    totalPracticePoints: { type: Number, default: 0 },

    // Map for season points: key e.g. "2025-9" => Number
    seasonPoints: {
      type: Map,
      of: Number,
      default: {},
    },

    // Daily streak info
    currentStreak: { type: Number, default: 0 },
    lastDailyAt: { type: Date, default: null },

    // Optional: badges earned by user
    badges: { type: [String], default: [] },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
