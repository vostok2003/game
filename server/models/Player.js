// server/models/Player.js
import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    // store userId to map to DB user (recommended)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
    current: { type: Number, default: 0 },
  },
  { _id: false }
);

export default PlayerSchema;
