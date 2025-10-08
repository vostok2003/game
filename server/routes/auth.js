// server/routes/auth.js (existing file)
import express from "express";
import { signup, login, getMe } from "../controllers/AuthController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", getMe);  // <<< ADDED

export default router;
