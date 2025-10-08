// server/index.js
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server as IOServer } from "socket.io";
import passport from "passport";
import "./config/passport.js";

import { connectDB } from "./config/db.js";
import config from "./config/index.js";

import authRouter from "./routes/auth.js";
import leaderboardRouter from "./routes/leaderboard.js";
import singleplayerRouter from "./routes/singleplayer.js";
import googleAuthRouter from "./routes/googleAuth.js";
import dailyRouter from "./routes/daily.js";
import contestRouter from "./routes/contest.js";

import socketHandlers from "./sockets/socketHandlers.js";
import { startContestScheduler } from "./utils/contestScheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.PORT || process.env.PORT || 5000;

connectDB().catch((err) => console.error("DB connection error:", err));

app.use(express.json());
app.use(cookieParser());

// ✅ CORS fix
app.use(
  cors({
    origin: config.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(passport.initialize());

app.use("/api", authRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/singleplayer", singleplayerRouter);
app.use("/auth", googleAuthRouter);
app.use("/api/daily", dailyRouter);
app.use("/api/contest", contestRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  next();
});

if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../react-app/dist");
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.send("API running (dev mode)"));
}

const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: config.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

socketHandlers(io);

server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  
  // Start the contest scheduler
  startContestScheduler();
});
