// server/utils/eloHelper.js
import User from "../models/User.js";

/**
 * Elo update for n-player free-for-all
 * players: [{ userId, rating, score }]
 * 
 * Returns updated user docs (lean)
 */
export async function updateRatingsForMatchElo(players) {
  if (!players || players.length < 2) return [];

  // Ensure numeric values
  players = players.map(p => ({
    ...p,
    rating: Number(p.rating ?? 1500),
    score: Number(p.score ?? 0),
  }));

  const K = 32; // tuning factor (higher = faster rating changes)

  // Expected scores
  const expected = {};
  players.forEach(p => { expected[p.userId] = 0; });

  for (let i = 0; i < players.length; i++) {
    for (let j = 0; j < players.length; j++) {
      if (i === j) continue;
      const Ri = players[i].rating;
      const Rj = players[j].rating;
      const Ei = 1 / (1 + Math.pow(10, (Rj - Ri) / 400));
      expected[players[i].userId] += Ei;
    }
  }

  // Actual scores
  const actual = {};
  players.forEach(p => { actual[p.userId] = 0; });

  for (let i = 0; i < players.length; i++) {
    for (let j = 0; j < players.length; j++) {
      if (i === j) continue;
      const si = players[i].score;
      const sj = players[j].score;
      let outcome = 0.5;
      if (si > sj) outcome = 1;
      else if (si < sj) outcome = 0;
      actual[players[i].userId] += outcome;
    }
  }

  // Update DB
  const updatedDocs = await Promise.all(players.map(async (p) => {
    const uid = p.userId;
    const exp = expected[uid];
    const act = actual[uid];
    const delta = K * (act - exp);
    const newRating = Math.max(100, Math.round(p.rating + delta)); // prevent <100

    try {
      const updated = await User.findByIdAndUpdate(
        uid,
        { rating: newRating, lastRatedAt: new Date() },
        { new: true }
      ).lean();
      return updated;
    } catch (err) {
      console.error("ELO persist failed for", uid, err);
      return null;
    }
  }));

  return updatedDocs.filter(Boolean);
}
