// server/config/index.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM __dirname trick
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server/.env (explicit)
dotenv.config({ path: path.join(__dirname, "../.env") });

// Simple helper to warn if a required env var missing
const getRequired = (key) => {
  const val = process.env[key];
  if (!val) {
    console.warn(`WARNING: Environment variable ${key} is not set.`);
  }
  return val;
};

const config = {
  PORT: process.env.PORT || "5000",
  MONGO_URI: getRequired("MONGO_URI"),
  JWT_SECRET: getRequired("JWT_SECRET"),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  NODE_ENV: process.env.NODE_ENV || "development",
};

// Helpful debug in dev to ensure .env loaded
if (process.env.NODE_ENV !== "production") {
  console.log("Loaded server config — JWT_SECRET present?", !!process.env.JWT_SECRET);
  console.log("CORS_ORIGIN:", config.CORS_ORIGIN);
}

export default config;
