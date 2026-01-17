// server/sockets/socketHandlers.js

import {
  createRoom,
  joinRoom,
  startGame,
  submitAnswer,
  disconnect,
  authenticateSocket,
  getTimer,
  rejoinRoom,
  disconnectTimeouts,
  rematchRoom, // ✅ FIX 1: IMPORT ADDED
} from "../controllers/RoomController.js";

import Room from "../models/Room.js";
import User from "../models/User.js";
import { updateRatingsForMatchElo } from "../utils/eloHelper.js";

const roomTimers = {};
const rematchRequests = {};
const finalizedRooms = new Set();

export default function socketHandlers(io) {
  // 🔐 Authenticate every socket connection
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ---------- CREATE ROOM ----------
    socket.on("createRoom", async (data, callback) => {
      const room = await createRoom(socket, data, callback);
      if (room) io.to(room.roomCode).emit("roomUpdate", room.players);
    });

    // ---------- JOIN ROOM ----------
    socket.on("joinRoom", async (data, callback) => {
      const room = await joinRoom(socket, data, callback);
      if (room) io.to(room.roomCode).emit("roomUpdate", room.players);
    });

    // ---------- START GAME ----------
    socket.on("startGame", async () => {
      const roomCode = socket.data.roomCode;
      const room = await startGame(roomCode);
      if (!room) return;

      io.to(roomCode).emit("gameStarted", {
        questions: room.questions.map((q) => q.question),
        mode: room.mode,
        players: room.players,
      });

      finalizedRooms.delete(roomCode);
      startRoomTimerInterval(roomCode);
    });

    // ---------- TIMER ----------
    socket.on("getTimer", async (_, callback) => {
      const { timeLeft } = await getTimer(socket.data.roomCode);
      callback({ timeLeft });
    });

    // ---------- SUBMIT ANSWER ----------
    socket.on("submitAnswer", async (data, callback) => {
      const { room, advanced } = await submitAnswer(socket, data, callback);
      if (!room || !advanced) return;

      io.to(room.roomCode).emit(
        "progressUpdate",
        room.players.map((p) => ({
          name: p.name,
          userId: p.userId,
          score: p.score,
          current: p.current,
        }))
      );

      const allDone = room.players.every(
        (p) => p.current >= room.questions.length
      );

      if (allDone) {
        clearRoomTimer(room.roomCode);
        await finalizeRoomAndUpdateRatings(room.roomCode, io);
      }
    });

    // ---------- REJOIN ----------
    socket.on("rejoinRoom", async (data, callback) => {
      await rejoinRoom(socket, data, callback);
      finalizedRooms.delete(data.roomCode);
      startRoomTimerInterval(data.roomCode);
    });

    // ---------- DISCONNECT ----------
    socket.on("disconnect", async () => {
      const roomCode = socket.data.roomCode;
      const name = socket.data.name;
      const userId = socket.data.userId;

      if (roomCode && name) {
        io.to(roomCode).emit("playerLeftTemporarily", { name });
      }

      await disconnect(socket);

      if (roomCode) {
        const key = roomCode + ":" + (userId || name);
        setTimeout(async () => {
          if (!disconnectTimeouts[key]) return;

          const room = await Room.findOne({ roomCode });
          if (!room || finalizedRooms.has(roomCode)) return;

          if (room.players.length < 2) {
            clearRoomTimer(roomCode);
            await finalizeRoomAndUpdateRatings(roomCode, io);
          }
        }, 5000);
      }
    });

    // ---------- REMATCH (🔥 FINAL FIXED VERSION) ----------
    socket.on("rematch", async (_, callback) => {
      const roomCode = socket.data.roomCode;
      const userId = String(socket.data.userId);

      if (!roomCode || !userId) {
        return callback?.({ error: "Invalid rematch request" });
      }

      if (!rematchRequests[roomCode]) {
        rematchRequests[roomCode] = new Set();
      }

      rematchRequests[roomCode].add(userId);

      const room = await Room.findOne({ roomCode });
      if (!room) return callback?.({ error: "Room not found" });

      const playerIds = room.players
        .map((p) => p.userId)
        .filter(Boolean)
        .map((id) => String(id));

      const allAccepted = playerIds.every((id) =>
        rematchRequests[roomCode].has(id)
      );

      if (!allAccepted) {
        socket.to(roomCode).emit("rematchRequested", { userId });
        return callback?.({ waiting: true });
      }

      // 🔥 BOTH ACCEPTED
      rematchRequests[roomCode].clear();
      clearRoomTimer(roomCode);
      finalizedRooms.delete(roomCode);

      const newRoom = await rematchRoom(roomCode);

      io.to(roomCode).emit("rematchStarted", {
        questions: newRoom.questions.map((q) => q.question),
        mode: newRoom.mode,
        players: newRoom.players,
      });

      await startGame(roomCode);
      startRoomTimerInterval(roomCode);

      callback?.({ ok: true });
    });
  });

  // ================= HELPERS =================

  function clearRoomTimer(roomCode) {
    if (roomTimers[roomCode]) {
      clearInterval(roomTimers[roomCode]);
      delete roomTimers[roomCode];
    }
  }

  async function startRoomTimerInterval(roomCode) {
    if (roomTimers[roomCode]) return;

    const room = await Room.findOne({ roomCode });
    if (!room || !room.started) return;

    roomTimers[roomCode] = setInterval(async () => {
      const { timeLeft } = await getTimer(roomCode);
      io.to(roomCode).emit("timerUpdate", { timeLeft });

      if (timeLeft <= 0) {
        clearRoomTimer(roomCode);
        await finalizeRoomAndUpdateRatings(roomCode, io);
      }
    }, 1000);
  }

  async function finalizeRoomAndUpdateRatings(roomCode, ioInstance) {
    if (finalizedRooms.has(roomCode)) return;
    finalizedRooms.add(roomCode);

    const room = await Room.findOne({ roomCode }).lean();
    if (!room) return;

    const players = [];
    for (const p of room.players) {
      if (!p.userId) continue;
      const user = await User.findById(p.userId);
      if (user) {
        players.push({
          userId: user._id.toString(),
          rating: user.rating,
          score: p.score,
          name: user.name,
        });
      }
    }

    if (players.length >= 2) {
      const updated = await updateRatingsForMatchElo(players);
      ioInstance.to(roomCode).emit("ratingUpdate", updated);
    }

    const leaderboard = await User.find()
      .sort({ rating: -1 })
      .limit(50)
      .select("name rating")
      .lean();

    ioInstance.emit("leaderboardUpdate", leaderboard);
  }
}