// server/models/DailyProblem.js
import mongoose from "mongoose";

const ProblemSchema = new mongoose.Schema(
  {
    question: String,
    answer: Number,
    solution: { type: String, default: "" },
  },
  { _id: false }
);

const SectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // basic, intermediate, advanced, elite, legendary
    title: String,
    problems: [ProblemSchema],
  },
  { _id: false }
);

const DailyProblemSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  sections: [SectionSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("DailyProblem", DailyProblemSchema);
