// server/models/User.js
import mongoose from "mongoose";

const SeasonPointsSchema = new mongoose.Schema({}, { strict: false, _id: false });

// Use Map type for seasonPoints to make nested dynamic keys robust
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
    rating: { type: Number, default: 1500 }, // player's rating
    rd: { type: Number, default: 350 }, // rating deviation
    volatility: { type: Number, default: 0.06 }, // glicko-2 volatility
    lastRatedAt: { type: Date, default: Date.now },

    // Daily/season related fields
    totalPracticePoints: { type: Number, default: 0 },
    // Make seasonPoints a Map<string, number>
    seasonPoints: { type: Map, of: Number, default: {} },

    // Streak tracking
    currentStreak: { type: Number, default: 0 },
    lastDailyAt: { type: Date },

    // Badges awarded to the user
    badges: { type: [String], default: [] },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
