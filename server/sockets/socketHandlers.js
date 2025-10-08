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
  rematchRoom,
  createSinglePlayerRoom,
  startSinglePlayerGame,
  getSinglePlayerTimer,
  submitSinglePlayerAnswer,
} from "../controllers/RoomController.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
// import { updateRatingsForMatch } from "../utils/glicko2Helper.js";

const roomTimers = {};
const rematchRequests = {};
const singlePlayerTimers = {};

// Track active users in each room
const activeUsers = new Map(); // roomId -> Set of userIds
const commentRooms = new Map(); // roomId -> Set of socketIdslt function socketHandlers(io) {
  // require socket auth
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    
    // Handle joining a discussion room for comments
    socket.on("joinDiscussion", (roomId) => {
      console.log(`Socket ${socket.id} joining discussion room:`, roomId);
      socket.join(roomId);
      
      // Track socket in comment room
      if (!commentRooms.has(roomId)) {
        commentRooms.set(roomId, new Set());

    socket.on("joinRoom", async (data, callback) => {
      const room = await joinRoom(socket, data, callback);
      if (room) io.to(room.roomCode).emit("roomUpdate", room.players);
    });

    socket.on("startGame", async () => {
      const roomCode = socket.data.roomCode;
      const room = await startGame(roomCode);
      if (room) {
        io.to(roomCode).emit("gameStarted", {
          questions: room.questions.map((q) => q.question),
          mode: room.mode,
        });
        await startRoomTimerInterval(roomCode);
        // Clear finalized flag if any (new game)
        finalizedRooms.delete(roomCode);
      }
    });

    socket.on("getTimer", async (data, callback) => {
      const roomCode = socket.data.roomCode;
      const { timeLeft } = await getTimer(roomCode);
      callback({ timeLeft });
    });

    socket.on("submitAnswer", async (data, callback) => {
      try {
        const result = await submitAnswer(socket, data, callback); // returns { room, advanced }
        const room = result?.room;
        const advanced = !!result?.advanced;
        if (!room) return;

        // Only broadcast progress when player's state actually changed (i.e., advanced)
        if (advanced) {
          io.to(room.roomCode).emit(
            "progressUpdate",
            room.players.map((p) => ({
              name: p.name,
              userId: p.userId,
              score: p.score,
              current: p.current,
            }))
          );

          // If everyone has completed all questions, finalize now
          const allDone = room.players.every(
            (p) => typeof p.current === "number" && p.current >= room.questions.length
          );
          if (allDone) {
            // Clear timer interval if running
            if (roomTimers[room.roomCode]) {
              clearInterval(roomTimers[room.roomCode]);
              delete roomTimers[room.roomCode];
            }
            try {
              await finalizeRoomAndUpdateRatings(room.roomCode, io);
            } catch (err) {
              console.error("Error finalizing room on all-done submitAnswer:", err);
            }
          }
        } else {
          // For wrong answer, we can optionally notify only the submitting socket (but callback already did).
          // No global emit.
        }
      } catch (err) {
        console.error("submitAnswer handler error:", err);
      }
    });

    socket.on("rejoinRoom", async (data, callback) => {
      await rejoinRoom(socket, data, callback);
      const roomCode = data.roomCode;
      await startRoomTimerInterval(roomCode);
      // If a room was flagged finalized (rare), clear it on rejoin so rematch/new start possible
      finalizedRooms.delete(roomCode);
    });

    socket.on("disconnect", async () => {
      const roomCode = socket.data.roomCode;
      const name = socket.data.name;
      const userId = socket.data.userId;
      // Notify others that player left temporarily
      if (roomCode && (name || userId)) {
        io.to(roomCode).emit("playerLeftTemporarily", { name });
      }

      await disconnect(socket);

      // schedule check after short grace (5s). If player didn't rejoin, finalize match if appropriate.
      if (roomCode) {
        const key = roomCode + ":" + (userId || name);
        // Keep existing disconnectTimeouts behavior (removal after 15s) but we do an earlier finalize check
        setTimeout(async () => {
          try {
            // if player rejoined, their disconnect timeout would have been cleared
            if (!disconnectTimeouts[key]) {
              // player rejoined - do nothing
              return;
            }
            const room = await Room.findOne({ roomCode }).lean();
            if (!room) return;

            // If match hasn't started or already finalized, do nothing
            if (!room.started || finalizedRooms.has(roomCode)) return;

            // If there is only one player remaining (opponent left) OR fewer than 2 players active,
            // finalize immediately so leaderboard & ratings update.
            const activeCount = room.players.length;
            if (activeCount < 2) {
              console.log(`[FINALIZE:on-disconnect] finalizing room ${roomCode} because opponent left`);
              // Ensure we clear timer
              if (roomTimers[roomCode]) {
                clearInterval(roomTimers[roomCode]);
                delete roomTimers[roomCode];
              }
              await finalizeRoomAndUpdateRatings(roomCode, io);
            }
          } catch (err) {
            console.error("Error in disconnect finalize check:", err);
          }
        }, 5000); // 5 second grace before forced finalize
      }

      // After longer grace (existing behavior) we will broadcast roomUpdate if player actually removed.
      if (roomCode && name) {
        setTimeout(async () => {
          const key = roomCode + ":" + name;
          if (!disconnectTimeouts[key]) {
            // player rejoined
            return;
          }
          const room = await Room.findOne({ roomCode });
          if (room) {
            io.to(roomCode).emit("roomUpdate", room.players);
            // If room was deleted (no players), clear timer interval & finalized flag
            if (room.players.length === 0 && roomTimers[roomCode]) {
              clearInterval(roomTimers[roomCode]);
              delete roomTimers[roomCode];
            }
          }
        }, 16000);
      }

      // Single-player timers cleanup (if any)
      if (singlePlayerTimers[roomCode]) {
        clearInterval(singlePlayerTimers[roomCode]);
        delete singlePlayerTimers[roomCode];
      }

      console.log("User disconnected:", socket.id);
    });

    socket.on("rematch", async (data, callback) => {
      const roomCode = socket.data.roomCode;
      const name = socket.data.name;
      if (!roomCode || !name) return callback && callback({ error: "No room" });
      if (!rematchRequests[roomCode]) rematchRequests[roomCode] = new Set();
      rematchRequests[roomCode].add(name);
      const room = await Room.findOne({ roomCode });
      const playerNames = room.players.map((p) => p.name);
      if (playerNames.every((n) => rematchRequests[roomCode].has(n))) {
        const newRoom = await rematchRoom(roomCode);
        rematchRequests[roomCode] = new Set();
        io.to(roomCode).emit("rematchStarted", {
          questions: newRoom.questions.map((q) => q.question),
          mode: newRoom.mode,
          players: newRoom.players,
        });
        const startedRoom = await startGame(roomCode);
        if (startedRoom) {
          io.to(roomCode).emit("gameStarted", {
            questions: startedRoom.questions.map((q) => q.question),
            mode: startedRoom.mode,
          });
          await startRoomTimerInterval(roomCode);
        }
        // allow new finalization for this rematch (clear previous finalized flag)
        finalizedRooms.delete(roomCode);
      } else {
        socket.to(roomCode).emit("rematchRequested", { name });
      }
      callback && callback({ ok: true });
    });

    socket.on("createSinglePlayerRoom", async (data, callback) => {
      const room = await createSinglePlayerRoom(socket, data, callback);
    });

    socket.on("startSinglePlayerGame", async () => {
      const roomCode = socket.data.roomCode;
      const room = await startSinglePlayerGame(roomCode);
      if (room) {
        socket.emit("singlePlayerGameStarted", {
          questions: room.questions.map((q) => q.question),
          mode: room.mode,
        });
        // Start timer updates for this socket only
        if (singlePlayerTimers[roomCode]) clearInterval(singlePlayerTimers[roomCode]);
        singlePlayerTimers[roomCode] = setInterval(async () => {
          const { timeLeft } = await getSinglePlayerTimer(roomCode);
          socket.emit("timerUpdate", { timeLeft });
          if (timeLeft <= 0) {
            clearInterval(singlePlayerTimers[roomCode]);
            delete singlePlayerTimers[roomCode];
          }
        }, 1000);
      }
    });

    socket.on("getSinglePlayerTimer", async (data, callback) => {
      const roomCode = socket.data.roomCode;
      const { timeLeft } = await getSinglePlayerTimer(roomCode);
      callback({ timeLeft });
    });

    socket.on("submitSinglePlayerAnswer", async (data, callback) => {
      try {
        const result = await submitSinglePlayerAnswer(socket, data, callback);
        const room = result?.room;
        const advanced = !!result?.advanced;
        if (!room) return;
        // Emit progressUpdate only when player advanced
        if (advanced) {
          socket.emit(
            "progressUpdate",
            room.players.map((p) => ({
              name: p.name,
              userId: p.userId,
              score: p.score,
              current: p.current,
            }))
          );
        }
      } catch (err) {
        console.error("submitSinglePlayerAnswer handler error:", err);
      }
    });
  });

  /**
   * Helper: finalize match, update ratings in DB, emit ratings and leaderboard
   * Marks room as finalized to avoid duplicate runs.
   */
   async function finalizeRoomAndUpdateRatings(roomCode, ioInstance) {
    if (!roomCode) return;
    if (finalizedRooms.has(roomCode)) {
      // already finalized
      console.log(`[FINALIZE] room ${roomCode} already finalized, skipping`);
      return;
    }
    finalizedRooms.add(roomCode);

    try {
      const finalRoom = await Room.findOne({ roomCode }).lean();
      if (!finalRoom) {
        console.warn(`[FINALIZE] Room not found: ${roomCode}`);
        return;
      }

      console.log(`[FINALIZE] finalizing room ${roomCode} players:`, finalRoom.players);

      // Build list of players with DB user info
      const playersToUpdate = [];
      for (const p of finalRoom.players) {
        let dbUser = null;
        if (p.userId) {
          try {
            dbUser = await User.findById(p.userId);
          } catch (e) {
            dbUser = null;
            console.warn(`[FINALIZE] findById error for userId ${p.userId}:`, e.message || e);
          }
        }
        if (!dbUser) {
          // fallback: try find by name (only as last resort)
          try {
            dbUser = await User.findOne({ name: p.name });
            if (dbUser) {
              console.log(`[FINALIZE] matched player ${p.name} to DB user ${dbUser._id} by name`);
            }
          } catch (e) {
            console.warn(`[FINALIZE] findOne by name error for ${p.name}:`, e.message || e);
          }
        }
        if (dbUser) {
          playersToUpdate.push({
            userId: dbUser._id.toString(),
            rating: dbUser.rating ?? 1500,
            rd: dbUser.rd ?? 350,
            volatility: dbUser.volatility ?? 0.06,
            score: p.score ?? 0,
            name: dbUser.name,
          });
        } else {
          console.log(`[FINALIZE] skipping non-DB player: ${p.name}`);
        }
      }

      console.log(`[FINALIZE] playersToUpdate (${playersToUpdate.length}):`, playersToUpdate.map(p => ({ userId: p.userId, score: p.score })));

      if (playersToUpdate.length >= 2) {
        // Update ratings using Glicko-2 helper
        let updated = [];
        try {
          updated = await updateRatingsForMatchElo(playersToUpdate);
          console.log("[FINALIZE] updateRatingsForMatch returned:", updated.map(u => ({ _id: u._id, rating: u.rating, rd: u.rd })));
        } catch (err) {
          console.error("[FINALIZE] updateRatingsForMatch error:", err);
        }

        // Notify players in the room about updated ratings (they can update their UI)
        if (updated && updated.length > 0) {
          ioInstance.to(roomCode).emit(
            "ratingUpdate",
            updated.map((u) => ({
              _id: u._id,
              name: u.name,
              rating: u.rating,
              rd: u.rd,
            }))
          );
        } else {
          console.warn("[FINALIZE] No updated ratings to emit for room", roomCode);
        }

        // Publish global leaderboard to all connected sockets (read fresh)
        try {
          const top = await User.find().sort({ rating: -1 }).limit(50).select("name rating rd").lean();
          ioInstance.emit("leaderboardUpdate", top);
          console.log("[FINALIZE] leaderboardUpdate emitted. top[0..3]:", top.slice(0, 3));
        } catch (err) {
          console.error("[FINALIZE] Failed to fetch/emit leaderboard:", err);
        }
      } else {
        console.log("[FINALIZE] Not enough DB-linked players to update ratings. Broadcasting leaderboard only.");
        try {
          const top = await User.find().sort({ rating: -1 }).limit(50).select("name rating rd").lean();
          ioInstance.emit("leaderboardUpdate", top);
          console.log("[FINALIZE] (no-rating) leaderboardUpdate emitted. top[0..3]:", top.slice(0, 3));
        } catch (err) {
          console.error("[FINALIZE] Failed to fetch/emit leaderboard (no-rating):", err);
        }
      }
    } catch (err) {
      console.error("Error in finalizeRoomAndUpdateRatings:", err);
    } finally {
      // cleanup timer
      if (roomTimers[roomCode]) {
        clearInterval(roomTimers[roomCode]);
        delete roomTimers[roomCode];
      }
      // keep the finalizedRooms flag for 5 minutes to prevent duplicates
      setTimeout(() => finalizedRooms.delete(roomCode), 1000 * 60 * 5);
    }
  }

  /**
   * Manages a room's timer: emits timerUpdate every second and runs finalize when time ends.
   * Avoid creating duplicate intervals.
   */
  const startRoomTimerInterval = async (roomCode) => {
    if (!roomCode) return;
    if (roomTimers[roomCode]) return; // Already running
    const room = await Room.findOne({ roomCode });
    if (!room || !room.started || !room.timerStart || !room.timerDuration) return;

    // calculate remaining
    const elapsed = Math.floor((Date.now() - new Date(room.timerStart).getTime()) / 1000);
    let timeLeft = Math.max(room.timerDuration - elapsed, 0);
    if (timeLeft <= 0) {
      // already ended; finalize immediately
      await finalizeRoomAndUpdateRatings(roomCode, io);
      return;
    }

    roomTimers[roomCode] = setInterval(async () => {
      try {
        const { timeLeft } = await getTimer(roomCode);
        io.to(roomCode).emit("timerUpdate", { timeLeft });

        if (timeLeft <= 0) {
          clearInterval(roomTimers[roomCode]);
          delete roomTimers[roomCode];
          // Finalize match (update ratings / leaderboard)
          await finalizeRoomAndUpdateRatings(roomCode, io);
        }
      } catch (err) {
        console.error("Error in room timer interval:", err);
      }
    }, 1000);
  };
}
