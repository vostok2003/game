// src/utils/api.js
import axios from "axios";

// Remove /api from the end of VITE_API_URL if it's present
const envUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const baseURL = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// attach token automatically to every request if present
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore localStorage problems
    // console.warn("api: failed to read token from localStorage", e);
  }
  return config;
});

// Response interceptor: do not aggressively clear token on any 401.
// Let the auth UI (RequireAuth) or explicit auth logic decide how to handle session expiration.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Optional: you can log 401s while debugging
    // if (err?.response?.status === 401) {
    //   console.warn("[api] 401 received for", err.config?.url);
    // }
    return Promise.reject(err);
  }
);

export default api;
