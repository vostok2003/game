// server/config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://mathblitz.onrender.com/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Google profile did not contain email"), null);
        }

        // Try find existing user by email
        let user = await User.findOne({ email });

        if (!user) {
          // generate a secure random password and hash it - satisfies schema while user logs in via Google
          const randomPassword = crypto.randomBytes(24).toString("hex");
          const hashed = await bcrypt.hash(randomPassword, 10);

          user = await User.create({
            name: profile.displayName || email.split("@")[0],
            email,
            password: hashed,
            provider: "google",
            googleId: profile.id,
            rating: 1500,
            rd: 350,
            volatility: 0.06,
          });
        } else {
          // If user exists but doesn't have googleId or provider set, set them (safe update)
          let updated = false;
          if (!user.googleId && profile.id) {
            user.googleId = profile.id;
            updated = true;
          }
          if (!user.provider) {
            user.provider = "google";
            updated = true;
          }
          if (updated) await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// These are only required if you use sessions (you don’t since we issue JWT)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
