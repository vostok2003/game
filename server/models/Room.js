import mongoose from "mongoose";
import PlayerSchema from "./Player.js";

const QuestionSchema = new mongoose.Schema(
  {
    question: String,
    answer: Number,
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  mode: { type: Number, required: true },
  questions: [QuestionSchema],
  players: [PlayerSchema],
  started: { type: Boolean, default: false },
  timer: { type: Number, default: null },
  timerStart: { type: Date, default: null },
  timerDuration: { type: Number, default: null },
});

const Room = mongoose.model("Room", RoomSchema);
export default Room;
