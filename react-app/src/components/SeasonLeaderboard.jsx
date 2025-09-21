// src/components/SeasonLeaderboard.jsx
import React, { useMemo, useState } from "react";

/**
 * SeasonLeaderboard (with top-3 hero)
 *
 * Props:
 *  - items: sorted descending by seasonPoints
 *  - currentUserId / currentUserName optional
 */

function Trophy({ rank }) {
  const map = {
    1: { bg: "bg-yellow-400", emoji: "🥇" },
    2: { bg: "bg-slate-300", emoji: "🥈" },
    3: { bg: "bg-orange-200", emoji: "🥉" },
  }[rank];
  if (!map) return null;
  return <div className={`flex items-center justify-center w-10 h-10 rounded-full ${map.bg} shadow-inner text-lg`}>{map.emoji}</div>;
}

function Avatar({ name, size = 56 }) {
  const initials = (name || "U").split(" ").slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");
  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500", "bg-sky-500", "bg-rose-500"];
  const idx = Math.abs(name ? name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 0) % colors.length;
  return <div className={`${colors[idx]} text-white font-semibold rounded-full flex items-center justify-center`} style={{ width: size, height: size }}>{initials || "U"}</div>;
}

export default function SeasonLeaderboard({ items = [], currentUserId = null, currentUserName = null }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 9;

  // ensure items sorted desc by seasonPoints
  const sorted = useMemo(() => (Array.isArray(items) ? items.slice().sort((a, b) => (b.seasonPoints || 0) - (a.seasonPoints || 0)) : []), [items]);

  const filtered = useMemo(() => {
    if (!q.trim()) return sorted;
    const ql = q.toLowerCase();
    return sorted.filter((it) => (it.name || "").toLowerCase().includes(ql));
  }, [sorted, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  function goto(p) { setPage(Math.max(1, Math.min(totalPages, p))); }

  const top3 = filtered.slice(0, 3);

  return (
    <section>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-800">Season Leaderboard</h3>
          <p className="text-sm text-slate-500 mt-1">Top performers this season</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search player..." className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 text-sm" />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path></svg>
            {q && <button onClick={() => { setQ(""); setPage(1); }} title="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">✕</button>}
          </div>
        </div>
      </div>

      {/* Top-3 hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 flex items-stretch gap-4">
          {/* 1st place large hero */}
          {top3[0] ? (
            <div className="flex-1 bg-white p-5 rounded-2xl shadow-md border">
              <div className="flex items-center gap-4">
                <div>
                  <Avatar name={top3[0].name} size={96} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-extrabold text-slate-800">{top3[0].name}</div>
                    <div className="text-sm text-slate-400">#{1}</div>
                    <div className="ml-2"><Trophy rank={1} /></div>
                  </div>
                  <div className="mt-3 text-slate-600">Top performer this season with <span className="font-semibold">{top3[0].seasonPoints ?? 0}</span> pts</div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="text-sm text-slate-500">Rating: <span className="font-medium">{top3[0].rating ?? "-"}</span></div>
                    <div className="text-sm text-slate-500">±{top3[0].rd ?? "-"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-slate-800">{top3[0].seasonPoints ?? 0}</div>
                  <div className="text-sm text-slate-400">pts</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-2xl border-dashed border p-5 text-center text-slate-500">No top performer yet</div>
          )}

          {/* 2nd and 3rd */}
          <div className="w-72 space-y-4">
            {top3.slice(1, 3).map((p, idx) => (
              <div key={p._id || idx} className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} size={56} />
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-400">#{idx + 2}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{p.seasonPoints ?? 0}</div>
                  <div className="text-xs text-slate-400">pts</div>
                </div>
              </div>
            ))}
            {top3.length < 3 && Array.from({ length: Math.max(0, 2 - (top3.length - 1)) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white/40 rounded-xl p-4 border-dashed border text-center text-slate-400">—</div>
            ))}
          </div>
        </div>

        {/* Right column: grid preview for next top entries*/}
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-sm text-slate-500 mb-2">Top 10</div>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {filtered.slice(0, 10).map((p, i) => (
              <li key={p._id || i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-slate-400">#{i + 1}</div>
                </div>
                <div className="text-sm text-slate-700">{p.seasonPoints ?? 0}</div>
              </li>
            ))}
            {filtered.length === 0 && <div className="text-slate-400">No entries yet</div>}
          </ol>
        </div>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageItems.map((p, i) => {
          const globalIndex = (page - 1) * perPage + i;
          const rank = globalIndex + 1;
          const isMe = (currentUserId && String(currentUserId) === String(p._id)) || (currentUserName && currentUserName === p.name);
          const topThree = rank <= 3;
          return (
            <article key={p._id || i} className={`relative flex items-center justify-between gap-4 p-4 rounded-xl transition hover:-translate-y-0.5 ${topThree ? "bg-indigo-50 border-indigo-100 shadow" : isMe ? "bg-blue-50 border-blue-100" : "bg-white border-slate-100"}`}>
              <div className="flex items-center gap-4">
                <Avatar name={p.name} size={56} />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">#{rank}</div>
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

      {/* pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">Showing <span className="font-medium">{(page - 1) * perPage + 1}</span>–<span className="font-medium">{Math.min(filtered.length, page * perPage)}</span> of <span className="font-medium">{filtered.length}</span></div>

        <div className="flex items-center gap-2">
          <button onClick={() => goto(page - 1)} className="px-3 py-1 rounded-md border bg-white disabled:opacity-50" disabled={page <= 1}>Prev</button>
          <div className="text-sm px-3 py-1 rounded-md bg-slate-100">{page}/{totalPages}</div>
          <button onClick={() => goto(page + 1)} className="px-3 py-1 rounded-md border bg-white disabled:opacity-50" disabled={page >= totalPages}>Next</button>
        </div>
      </div>
    </section>
  );
}
