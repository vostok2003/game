// server/controllers/SinglePlayerController.js
import generateQuestions from "../utils/questionGenerator.js";
import { v4 as uuidv4 } from "uuid";

const sessions = {}; // In-memory session store

export function startSinglePlayerGame(req, res) {
  const { mode } = req.body; // mode in minutes
  const questions = generateQuestions(80);
  const sessionId = uuidv4();
  const timerDuration = (mode || 1) * 60; // seconds
  sessions[sessionId] = {
    questions,
    current: 0,
    score: 0,
    timerStart: Date.now(),
    timerDuration,
    over: false,
  };
  res.json({
    sessionId,
    questions: questions.map((q) => q.question),
    timerDuration,
    current: 0,
    score: 0,
  });
}

export function submitSinglePlayerAnswer(req, res) {
  try {
    const { sessionId, answer } = req.body;
    const session = sessions[sessionId];
    if (!session || session.over)
      return res.status(400).json({ error: "Session not found or over" });

    const idx = session.current;
    if (!session.questions || !session.questions[idx]) {
      return res.status(400).json({ error: "Invalid question index" });
    }

    const correct = Number(answer) === session.questions[idx].answer;
    if (correct) {
      session.score++;
      session.current++;
    } else {
      // do not advance the question on wrong answer
      // optionally, you might record attempt count if needed
    }

    // Check if game is over after possible advance
    if (session.current >= session.questions.length) session.over = true;

    res.json({
      correct,
      nextQuestion: session.questions[session.current]?.question,
      score: session.score,
      current: session.current,
      over: session.over,
    });
  } catch (err) {
    console.error("submitSinglePlayerAnswer error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export function getSinglePlayerTimer(req, res) {
  const { sessionId } = req.query;
  const session = sessions[sessionId];
  if (!session) return res.status(400).json({ error: "Session not found" });
  const elapsed = Math.floor((Date.now() - session.timerStart) / 1000);
  const timeLeft = Math.max(session.timerDuration - elapsed, 0);
  if (timeLeft <= 0) session.over = true;
  res.json({ timeLeft, over: session.over });
}
