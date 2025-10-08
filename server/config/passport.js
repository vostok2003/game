// server/config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import config from './index.js';

dotenv.config();

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://mathblitz.onrender.com/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Google profile did not contain email'), null);
        }

        // Try find existing user by email
        let user = await User.findOne({ email });

        if (!user) {
          // generate a secure random password and hash it
          const randomPassword = crypto.randomBytes(24).toString('hex');
          const hashed = await bcrypt.hash(randomPassword, 10);

          user = await User.create({
            name: profile.displayName || email.split('@')[0],
            email,
            password: hashed,
            provider: 'google',
            googleId: profile.id,
            rating: 1500,
            rd: 350,
            volatility: 0.06,
          });
        } else {
          // If user exists but doesn't have googleId or provider set, update them
          let updated = false;
          if (!user.googleId && profile.id) {
            user.googleId = profile.id;
            updated = true;
          }
          if (!user.provider) {
            user.provider = 'google';
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

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      let token = null;
      // Try to get token from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
      // If not found in header, try to get from cookies
      if (!token && req.cookies) {
        token = req.cookies.token;
      }
      return token;
    }
  ]),
  secretOrKey: config.JWT_SECRET,
  ignoreExpiration: false,
  passReqToCallback: true
};

passport.use(new JwtStrategy(jwtOptions, async (req, payload, done) => {
  try {
    if (!payload?.id) {
      return done(null, false, { message: 'Invalid token' });
    }
    
    const user = await User.findById(payload.id).select('-password');
    if (!user) {
      return done(null, false, { message: 'User not found' });
    }
    
    // Attach user to request for use in route handlers
    req.user = user;
    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));

// These are only required if you use sessions (we don't since we use JWT)
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

export default passport;
