// client/src/socket.jsx
import { io } from "socket.io-client";

const BACKEND_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export function createSocket() {
  const token = localStorage.getItem("token");
  const socket = io(BACKEND_ORIGIN, {
    auth: { token },
    transports: ["websocket", "polling"],
    withCredentials: true,
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err?.message || err);
  });

  return socket;
}

let socketInstance = null;

export default function getSocket() {
  if (!socketInstance) socketInstance = createSocket();
  return socketInstance;
}
