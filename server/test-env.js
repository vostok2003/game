// test-env.js
import dotenv from "dotenv";
dotenv.config();
console.log("JWT_SECRET:", !!process.env.JWT_SECRET); // prints true if present
console.log("JWT length:", process.env.JWT_SECRET?.length || 0);
console.log("MONGO_URI startsWith mongodb:", process.env.MONGO_URI?.startsWith("mongodb") ? "yes" : "no");
