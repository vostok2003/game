// react-app/src/services/dailyService.js
import api from "../utils/api";

export async function fetchToday() {
  const res = await api.get("/daily/today");
  return res.data;
}

export async function fetchSectionProblems(date, sectionKey) {
  const res = await api.get(`/daily/section/${date}/${sectionKey}`);
  return res.data;
}

export async function submitDailyAttempt(payload) {
  const res = await api.post("/daily/submit", payload);
  return res.data;
}

export async function fetchDailyLeaderboard(date, sectionKey, limit = 20) {
  const res = await api.get("/daily/leaderboard", { params: { date, sectionKey, limit } });
  return res.data;
}

export async function fetchSeasonLeaderboard(year, month) {
  const res = await api.get("/daily/season", { params: { year, month } });
  return res.data;
}

export async function fetchStreak() {
  const res = await api.get("/daily/streak");
  return res.data;
}

export async function postComment(payload) {
  const res = await api.post("/daily/comment", payload);
  return res.data;
}

export async function fetchComments(date, sectionKey, limit = 50) {
  const res = await api.get("/daily/comments", { params: { date, sectionKey, limit } });
  return res.data;
}
