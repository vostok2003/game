// server/routes/googleAuth.js
import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// Start OAuth (unchanged)
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Callback — custom callback to log error body
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Google OAuth callback error:", err);
      if (err.data) {
        try {
          const body = err.data.toString();
          console.error("Google token endpoint response body:", body);
        } catch (e) {
          console.error("Failed to parse err.data:", e);
        }
      }
      return res.redirect(`${frontend}/login?oauth_error=1`);
    }

    if (!user) {
      console.warn("Google callback no user:", info);
      return res.redirect(`${frontend}/login`);
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.redirect(`${frontend}/auth/success?token=${token}`);
  })(req, res, next);
});

export default router;
