// server/controllers/AuthController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

const JWT_SECRET = config.JWT_SECRET;

/**
 * Signup - registers a new user with email/password
 */
export async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered." });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        score: user.score || 0,
        rating: user.rating || 1500,
        rd: user.rd || 350,
        volatility: user.volatility || 0.06,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Server error." });
  }
}

/**
 * Login - authenticates existing user with email/password
 */
export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        score: user.score || 0,
        rating: user.rating || 1500,
        rd: user.rd || 350,
        volatility: user.volatility || 0.06,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error." });
  }
}

/**
 * getMe - returns current user based on Bearer token or cookie token
 */
export async function getMe(req, res) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    if (!token) {
      token = req.cookies?.token;
    }
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return res.status(401).json({ error: "Invalid token" });

    const user = await User.findById(payload.id).select("-__v -password");
    if (!user) return res.status(401).json({ error: "User not found" });

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        score: user.score || 0,
        rating: user.rating || 1500,
        rd: user.rd || 350,
        volatility: user.volatility || 0.06,
      },
    });
  } catch (err) {
    console.error("getMe error", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(500).json({ error: "Server error" });
  }
}
