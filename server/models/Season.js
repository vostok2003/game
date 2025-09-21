// server/models/Season.js
import mongoose from "mongoose";

const SeasonSchema = new mongoose.Schema({
  year: Number,
  month: Number, // 1-12
  startAt: Date,
  endAt: Date,
  createdAt: { type: Date, default: Date.now },
  metadata: Object,
});

SeasonSchema.statics.currentSeason = async function () {
  const now = new Date();
  return this.findOne({ startAt: { $lte: now }, endAt: { $gte: now } }).lean();
};

export default mongoose.model("Season", SeasonSchema);
