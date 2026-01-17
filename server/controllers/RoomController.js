// server/controllers/RoomController.js
import Room from "../models/Room.js";
import generateQuestions from "../utils/questionGenerator.js";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

const JWT_SECRET = config.JWT_SECRET;

/**
 * Socket authentication middleware
 */
export function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.data.user = payload;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
}

/**
 * Create room
 */
export async function createRoom(socket, { mode }, callback) {
  const name = socket.data.user?.name || "Anonymous";
  const userId = socket.data.user?.id || null;

  let roomCode;
  while (true) {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (!(await Room.exists({ roomCode }))) break;
  }

  const room = await Room.create({
    roomCode,
    mode,
    questions: generateQuestions(20),
    players: [{ name, userId, score: 0, current: 0 }],
    started: false,
  });

  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.name = name;
  socket.data.userId = userId;

  callback({ roomCode, players: room.players });
  return room;
}

/**
 * Join room
 */
export async function joinRoom(socket, { roomCode }, callback) {
  const room = await Room.findOne({ roomCode });
  if (!room) return callback({ error: "Room not found" });
  if (room.players.length >= 2) return callback({ error: "Room full" });

  const name = socket.data.user?.name || "Anonymous";
  const userId = socket.data.user?.id || null;

  room.players.push({ name, userId, score: 0, current: 0 });
  await room.save();

  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.name = name;
  socket.data.userId = userId;

  callback({ roomCode, players: room.players });
  return room;
}

/**
 * Start game
 */
export async function startGame(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room || room.started) return room;

  room.started = true;
  room.timerStart = new Date();
  room.timerDuration = room.mode * 60;
  await room.save();

  return room;
}

/**
 * Timer
 */
export async function getTimer(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room?.timerStart) return { timeLeft: null };

  const elapsed = Math.floor((Date.now() - room.timerStart) / 1000);
  return { timeLeft: Math.max(room.timerDuration - elapsed, 0) };
}

/**
 * Submit answer
 */
export async function submitAnswer(socket, { answer }, callback) {
  const room = await Room.findOne({ roomCode: socket.data.roomCode });
  if (!room) return callback({ error: "Room not found" });

  const player = room.players.find(
    (p) => String(p.userId) === String(socket.data.userId)
  );
  if (!player) return callback({ error: "Player not found" });

  const q = room.questions[player.current];
  if (!q) return callback({ error: "No question" });

  const correct = Number(answer) === q.answer;
  if (correct) {
    player.score++;
    player.current++;
    await room.save();
  }

  callback({
    correct,
    score: player.score,
    currentQuestion: player.current,
    nextQuestion: room.questions[player.current]?.question,
  });

  return { room, advanced: correct };
}

/**
 * Disconnect handling
 */
export const disconnectTimeouts = {};

export async function disconnect(socket) {
  const { roomCode, userId, name } = socket.data;
  if (!roomCode) return;

  const key = `${roomCode}:${userId || name}`;
  disconnectTimeouts[key] = setTimeout(async () => {
    const room = await Room.findOne({ roomCode });
    if (!room) return;

    room.players = room.players.filter(
      (p) => String(p.userId) !== String(userId)
    );

    if (room.players.length === 0) {
      await Room.deleteOne({ roomCode });
    } else {
      await room.save();
    }
  }, 15000);
}

/**
 * Rejoin room
 */
export async function rejoinRoom(socket, { roomCode }, callback) {
  const room = await Room.findOne({ roomCode });
  if (!room) return callback({ error: "Room not found" });

  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.userId = socket.data.user?.id;
  socket.data.name = socket.data.user?.name;

  const key = `${roomCode}:${socket.data.userId}`;
  if (disconnectTimeouts[key]) {
    clearTimeout(disconnectTimeouts[key]);
    delete disconnectTimeouts[key];
  }

  callback({
    roomCode,
    players: room.players,
    questions: room.questions.map((q) => q.question),
    started: room.started,
  });
}

/**
 * Rematch
 */
export async function rematchRoom(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;

  room.questions = generateQuestions(20);
  room.players.forEach((p) => {
    p.score = 0;
    p.current = 0;
  });
  room.started = false;
  room.timerStart = null;
  room.timerDuration = null;

  await room.save();
  return room;
}