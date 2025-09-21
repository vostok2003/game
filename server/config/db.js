// server/config/db.js
import mongoose from "mongoose";
import config from "./index.js";

export async function connectDB() {
  if (!config.MONGO_URI) {
    console.error("MONGO_URI not set in environment. Exiting.");
    process.exit(1);
  }

  try {
    await mongoose.connect(config.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}
