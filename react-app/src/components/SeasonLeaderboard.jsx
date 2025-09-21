// src/components/SeasonLeaderboard.jsx
import React, { useMemo, useState } from "react";

/**
 * SeasonLeaderboard (styled)
 *
 * Props:
 *  - items: [{ _id, name, seasonPoints, rating?, rd? }]
 *  - currentUserId or currentUserName (optional) to highlight current user
 *
 * Visual features:
 *  - Top 3 highlighted with trophy badges
 *  - Avatar initials with color
 *  - Smooth hover, subtle shadows, gradients
 *  - Search with clear button
 *  - Pagination (9 per page)
 */

function Trophy({ rank }) {
  // prettier colors for medals
  const medal = {
    1: { bg: "bg-yellow-400", emoji: "🥇" },
    2: { bg: "bg-slate-300", emoji: "🥈" },
    3: { bg: "bg-orange-200", emoji: "🥉" },
  }[rank];

  if (!medal) return null;
  return (
    <div className={`flex items-center justify-center w-9 h-9 rounded-full ${medal.bg} shadow-inner text-sm`}>
      <span className="text-lg leading-none">{medal.emoji}</span>
    </div>
  );
}

function Avatar({ name, size = 40 }) {
  const initials = (name || "U").split(" ").slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");
  // deterministic color from name
  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500", "bg-sky-500", "bg-rose-500"];
  const idx = Math.abs(
    name
      ? name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      : 0
  ) % colors.length;
  return (
    <div className={`flex items-center justify-center ${colors[idx]} text-white font-semibold rounded-full`} style={{ width: size, height: size }}>
      {initials || "U"}
    </div>
  );
}

export default function SeasonLeaderboard({ items = [], currentUserId = null, currentUserName = null }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 9;

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const ql = q.toLowerCase();
    return items.filter((it) => (it.name || "").toLowerCase().includes(ql));
  }, [items, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  function goto(p) {
    setPage(Math.max(1, Math.min(totalPages, p)));
  }

  return (
    <section className="season-leaderboard">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <div>
          <h3 className="text-2xl font-extrabold text-slate-800">Season Leaderboard</h3>
          <p className="text-sm text-slate-500 mt-1">Top performers this season — climb the ranks by earning practice points.</p>
        </div>

        <div className="ml-auto flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search player..."
              aria-label="Search player"
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition shadow-sm bg-white text-sm"
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path></svg>
            {q && (
              <button onClick={() => { setQ(""); setPage(1); }} title="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
          No players found — be the first to submit practice points this season!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageItems.map((p, i) => {
              const globalIndex = (page - 1) * perPage + i;
              const rank = globalIndex + 1;
              const isMe = (currentUserId && String(currentUserId) === String(p._id)) || (currentUserName && currentUserName === p.name);
              const topThree = rank <= 3;
              return (
                <article
                  key={p._id || p.name || i}
                  className={
                    "relative flex items-center justify-between gap-4 p-4 rounded-xl transform transition hover:-translate-y-1 " +
                    (topThree
                      ? "bg-gradient-to-r from-white to-indigo-50 border border-indigo-100 shadow-md"
                      : isMe
                        ? "bg-blue-50 border border-blue-100 shadow-sm"
                        : "bg-white border border-slate-100 shadow-sm")
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar name={p.name} size={56} />
                      {topThree && (
                        <div className="absolute -right-2 -top-2">
                          <Trophy rank={rank} />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">#{rank}</div>
                        {isMe && <div className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">You</div>}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 6l2 4 4 .5-3 2 1.2 4L12 15l-4.2 2.5L9 12 6 10z"/></svg>
                          <span>{p.rating ?? "-"}</span>
                        </div>
                        <div className="text-xs text-slate-400">±{p.rd ?? "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-slate-800">{p.seasonPoints ?? 0}</div>
                    <div className="text-xs text-slate-400 mt-1">pts</div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium">{(page - 1) * perPage + 1}</span>–<span className="font-medium">{Math.min(filtered.length, page * perPage)}</span> of <span className="font-medium">{filtered.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => goto(page - 1)} className="px-3 py-1 rounded-md border text-sm bg-white hover:bg-slate-50 disabled:opacity-50" disabled={page <= 1}>Prev</button>
              <div className="text-sm px-3 py-1 rounded-md bg-slate-100 text-slate-700">{page}/{totalPages}</div>
              <button onClick={() => goto(page + 1)} className="px-3 py-1 rounded-md border text-sm bg-white hover:bg-slate-50 disabled:opacity-50" disabled={page >= totalPages}>Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
