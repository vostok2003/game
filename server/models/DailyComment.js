// server/models/DailyComment.js
import mongoose from "mongoose";

const DailyCommentSchema = new mongoose.Schema({
  date: { type: String, required: true },
  sectionKey: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("DailyComment", DailyCommentSchema);
