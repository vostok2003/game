// src/services/authService.js
import api from "../utils/api";

export async function signup({ name, email, password }) {
  const res = await api.post("/signup", { name, email, password });
  return res.data;
}

export async function login({ email, password }) {
  const res = await api.post("/login", { email, password });
  return res.data;
}

export function saveToken(token) {
  localStorage.setItem("token", token);
}

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
