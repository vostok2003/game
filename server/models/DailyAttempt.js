// server/models/DailyAttempt.js
import mongoose from "mongoose";

const DailyAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    sectionKey: { type: String, required: true },
    score: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // %
    timeBonus: { type: Number, default: 0 },
    practicePoints: { type: Number, default: 0 },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DailyAttemptSchema.index({ date: 1, sectionKey: 1, practicePoints: -1 });
DailyAttemptSchema.index({ userId: 1, date: 1, sectionKey: 1 }, { unique: true });

export default mongoose.model("DailyAttempt", DailyAttemptSchema);
