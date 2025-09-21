// server/routes/singleplayer.js
import express from "express";
import {
  startSinglePlayerGame,
  submitSinglePlayerAnswer,
  getSinglePlayerTimer,
} from "../controllers/SinglePlayerController.js";

const router = express.Router();

router.post("/start", startSinglePlayerGame);
router.post("/answer", submitSinglePlayerAnswer);
router.get("/timer", getSinglePlayerTimer);

export default router;
