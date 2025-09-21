import mongoose from "mongoose";

const ContestSchema = new mongoose.Schema({
  openTime: Date,
  closeTime: Date,
  duration: Number, // in seconds
  questions: [{ question: String, answer: Number }],
  registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  about: String,
  instructions: String,
  requirements: String,
});

export default mongoose.model("Contest", ContestSchema);
