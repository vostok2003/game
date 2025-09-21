import Contest from "../models/Contest.js";
import generateQuestions from "../utils/questionGenerator.js";
import User from "../models/User.js";

// Get next contest info
export async function getNextContest(req, res) {
  const now = new Date();
  const contest = await Contest.findOne({ closeTime: { $gt: now } }).sort({
    openTime: 1,
  });
  res.json(contest);
}

// Register for contest
export async function registerForContest(req, res) {
  const { contestId } = req.body;
  const userId = req.user.id;
  const contest = await Contest.findById(contestId);
  if (!contest) return res.status(404).json({ error: "Contest not found" });
  if (!contest.registeredUsers.includes(userId)) {
    contest.registeredUsers.push(userId);
    await contest.save();
  }
  res.json({ success: true });
}

// Deregister
export async function deregisterForContest(req, res) {
  const { contestId } = req.body;
  const userId = req.user.id;
  const contest = await Contest.findById(contestId);
  if (!contest) return res.status(404).json({ error: "Contest not found" });
  contest.registeredUsers = contest.registeredUsers.filter(
    (id) => id.toString() !== userId
  );
  await contest.save();
  res.json({ success: true });
}

// Get number of registered users
export async function getRegisteredCount(req, res) {
  const { contestId } = req.query;
  const contest = await Contest.findById(contestId);
  res.json({ count: contest ? contest.registeredUsers.length : 0 });
}

// Get contest questions (when live)
export async function getContestQuestions(req, res) {
  const { contestId } = req.query;
  const contest = await Contest.findById(contestId);
  if (!contest) return res.status(404).json({ error: "Contest not found" });
  const now = new Date();
  if (now < contest.openTime || now > contest.closeTime) {
    return res.status(403).json({ error: "Contest not live" });
  }
  res.json({ questions: contest.questions });
}
