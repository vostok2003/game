// client/src/services/dailyService.js
import api from "../utils/api";

/* daily */
export async function fetchToday() {
  const res = await api.get("/api/daily/today");
  return res.data;
}

export async function fetchSectionProblems(date, sectionKey) {
  const res = await api.get(`/api/daily/section/${date}/${sectionKey}`);
  return res.data;
}

export async function submitDailyAttempt(payload) {
  const res = await api.post("/api/daily/submit", payload);
  return res.data;
}

export async function fetchDailyLeaderboard(date, sectionKey, limit = 20) {
  const res = await api.get("/api/daily/leaderboard", { params: { date, sectionKey, limit } });
  return res.data;
}

/**
 * fetchSeasonLeaderboard
 * - Adds a small cache-busting `_ts` param to avoid stale 304 caching
 * - Keeps same signature: (year, month)
 */
export async function fetchSeasonLeaderboard(year, month) {
  const res = await api.get("/api/daily/season", {
    params: { year, month, _ts: Date.now() },
  });
  return res.data;
}

export async function fetchStreak() {
  const res = await api.get("/api/daily/streak");
  return res.data;
}

export async function postComment(payload) {
  const res = await api.post("/api/daily/comment", payload);
  return res.data;
}

export async function fetchComments(date, sectionKey, limit = 50) {
  const res = await api.get("/api/daily/comments", { params: { date, sectionKey, limit } });
  return res.data;
}

export async function voteComment(commentId, voteType) {
  const res = await api.post(`/api/daily/comments/${commentId}/vote`, { voteType });
  return res.data;
}
