// server/controllers/RoomController.js
import Room from "../models/Room.js";
import generateQuestions from "../utils/questionGenerator.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import config from "../config/index.js";

const JWT_SECRET = config.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    "RoomController: JWT_SECRET not configured. Socket auth will fail if tokens are required."
  );
}

/**
 * Socket authentication middleware (for socket.io)
 */
export function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    if (!JWT_SECRET) return next(new Error("JWT secret not configured"));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.data.user = payload;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
}

/**
 * Create a new room
 */
export async function createRoom(socket, { mode }, callback) {
  let name = socket.data.user?.name || "Anonymous";
  const userId = socket.data.user?.id || socket.data.user?.sub || null;

  let roomCode;
  let exists = true;
  while (exists) {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    exists = await Room.exists({ roomCode });
  }

  const questions = generateQuestions(20);
  const room = new Room({
    roomCode,
    mode,
    questions,
    players: [{ name, userId, score: 0, current: 0 }],
    started: false,
    timer: null,
  });

  await room.save();
  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.name = name;
  socket.data.userId = userId;

  callback({ roomCode, players: room.players });
  return room;
}

/**
 * Join existing room
 */
export async function joinRoom(socket, { roomCode }, callback) {
  let name = socket.data.user?.name || "Anonymous";
  const userId = socket.data.user?.id || socket.data.user?.sub || null;

  const room = await Room.findOne({ roomCode });
  if (!room) return callback({ error: "Room not found" });
  if (room.players.length >= 2) return callback({ error: "Room full" });

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
  if (!room) return null;
  if (!room.started) {
    room.started = true;
    room.timerStart = new Date();
    room.timerDuration = room.mode * 60;
    await room.save();
  }
  return room;
}

/**
 * Timer
 */
export async function getTimer(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room || !room.timerStart || !room.timerDuration)
    return { timeLeft: null };
  const elapsed = Math.floor(
    (Date.now() - new Date(room.timerStart).getTime()) / 1000
  );
  const timeLeft = Math.max(room.timerDuration - elapsed, 0);
  return { timeLeft };
}

/**
 * Submit answer (multiplayer)
 */
export async function submitAnswer(socket, { answer }, callback) {
  const roomCode = socket.data.roomCode;
  const room = await Room.findOne({ roomCode });
  if (!room) return;

  const player = room.players.find((p) => {
    if (socket.data.userId && p.userId) {
      try {
        return p.userId.toString() === socket.data.userId.toString();
      } catch {
        return false;
      }
    }
    return p.name === socket.data.name;
  });
  if (!player) return;

  const idx = player.current;

  if (!room.questions || !room.questions[idx]) {
    return callback({
      correct: false,
      error: "Invalid question index",
      score: player.score || 0,
    });
  }

  const correct = Number(answer) === room.questions[idx].answer;
  if (correct) player.score++;
  player.current++;

  await room.save();

  callback({
    correct,
    nextQuestion: room.questions[player.current]?.question,
    score: player.score,
  });

  return room;
}

/**
 * Disconnect handling
 */
export const disconnectTimeouts = {};
export async function disconnect(socket) {
  const roomCode = socket.data.roomCode;
  const name = socket.data.name;
  const userId = socket.data.userId;
  if (roomCode && (name || userId)) {
    const key = roomCode + ":" + (userId || name);
    disconnectTimeouts[key] = setTimeout(async () => {
      const room = await Room.findOne({ roomCode });
      if (!room) return null;
      room.players = room.players.filter((p) => {
        if (p.userId && userId) return p.userId.toString() !== userId.toString();
        return p.name !== name;
      });
      if (room.players.length === 0) {
        await Room.deleteOne({ roomCode });
        return null;
      } else {
        await room.save();
        return room;
      }
    }, 15000);
  }
  return null;
}

/**
 * Rejoin
 */
export async function rejoinRoom(socket, { roomCode, name: providedName }, callback) {
  let name = providedName || socket.data.user?.name || "Anonymous";
  const userId = socket.data.user?.id || socket.data.user?.sub || null;

  const room = await Room.findOne({ roomCode });
  if (!room) return callback({ error: "Room not found" });

  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.name = name;
  socket.data.userId = userId;

  const key = roomCode + ":" + (userId || name);
  if (disconnectTimeouts[key]) {
    clearTimeout(disconnectTimeouts[key]);
    delete disconnectTimeouts[key];
  }

  const player = room.players.find(
    (p) =>
      (p.userId && userId && p.userId.toString() === userId.toString()) ||
      p.name === name
  );

  let timeLeft = null;
  if (room.timerStart && room.timerDuration) {
    const elapsed = Math.floor(
      (Date.now() - new Date(room.timerStart).getTime()) / 1000
    );
    timeLeft = Math.max(room.timerDuration - elapsed, 0);
  }

  callback({
    roomCode,
    players: room.players,
    questions: room.questions.map((q) => q.question),
    mode: room.mode,
    timeLeft,
    started: room.started,
    playerState: player || null,
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

/**
 * ------------------------------------------
 * Single-player helpers (socket-friendly)
 * ------------------------------------------
 */

export async function createSinglePlayerRoom(socket, { mode }, callback) {
  let name = socket.data.user?.name || "Anonymous";
  const userId = socket.data.user?.id || socket.data.user?.sub || null;

  let roomCode;
  let exists = true;
  while (exists) {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    exists = await Room.exists({ roomCode });
  }

  const questions = generateQuestions(20);
  const room = new Room({
    roomCode,
    mode,
    questions,
    players: [{ name, userId, score: 0, current: 0 }],
    started: false,
    timer: null,
  });

  await room.save();
  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.name = name;
  socket.data.userId = userId;

  callback({
    roomCode,
    players: room.players,
    questions: room.questions.map((q) => q.question),
    mode,
  });

  return room;
}

export async function startSinglePlayerGame(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room) return null;
  room.started = true;
  room.timerStart = new Date();
  room.timerDuration = room.mode * 60;
  await room.save();
  return room;
}

export async function getSinglePlayerTimer(roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room || !room.timerStart || !room.timerDuration)
    return { timeLeft: null };
  const elapsed = Math.floor(
    (Date.now() - new Date(room.timerStart).getTime()) / 1000
  );
  const timeLeft = Math.max(room.timerDuration - elapsed, 0);
  return { timeLeft };
}

export async function submitSinglePlayerAnswer(socket, { answer }, callback) {
  const roomCode = socket.data.roomCode;
  const room = await Room.findOne({ roomCode });
  if (!room) return;

  const player = room.players.find((p) => {
    if (socket.data.userId && p.userId) {
      try {
        return p.userId.toString() === socket.data.userId.toString();
      } catch {
        return false;
      }
    }
    return p.name === socket.data.name;
  });
  if (!player) return;

  const idx = player.current;
  if (!room.questions || !room.questions[idx]) {
    return callback({
      correct: false,
      error: "Invalid question index",
      score: player.score || 0,
      currentQuestion: player.current,
    });
  }

  const correct = Number(answer) === room.questions[idx].answer;
  if (correct) player.score++;
  player.current++;

  await room.save();

  callback({
    correct,
    nextQuestion: room.questions[player.current]?.question,
    score: player.score,
    currentQuestion: player.current,
  });

  return room;
}
