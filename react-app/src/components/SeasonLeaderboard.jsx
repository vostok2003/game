// src/components/SeasonLeaderboard.jsx
import React, { useMemo, useState, useEffect } from "react";

/**
 * Enhanced SeasonLeaderboard with Mathematical & Logical UI
 *
 * Props:
 *  - items: sorted descending by seasonPoints
 *  - currentUserId / currentUserName optional
 */

// Mathematical Symbols Animation Component
const MathSymbolsAnimation = () => {
  const [symbols, setSymbols] = useState([]);
  
  const mathSymbols = ['∑', '∫', '∆', '∞', 'π', '√', '∂', '∇', '∈', '∀', '∃', '⊂', '⊃', '∪', '∩', '≡', '≠', '≤', '≥', '±', '×', '÷', '∝', '∴', '∵', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω'];

  useEffect(() => {
    const createSymbol = () => ({
      id: Math.random(),
      left: Math.random() * 100,
      animationDuration: Math.random() * 20 + 15,
      opacity: Math.random() * 0.04 + 0.01,
      size: Math.random() * 8 + 6,
      symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
      rotation: Math.random() * 360,
    });

    const initialSymbols = Array.from({ length: 3 }, createSymbol);
    setSymbols(initialSymbols);

    const interval = setInterval(() => {
      setSymbols(prev => {
        const newSymbols = [...prev];
        if (newSymbols.length < 5) {
          newSymbols.push(createSymbol());
        }
        return newSymbols;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {symbols.map((symbol) => (
        <div
          key={symbol.id}
          className="absolute animate-float text-blue-200/10 font-bold select-none"
          style={{
            left: `${symbol.left}%`,
            animationDuration: `${symbol.animationDuration}s`,
            opacity: symbol.opacity,
            fontSize: `${symbol.size}px`,
            transform: `rotate(${symbol.rotation}deg)`,
          }}
        >
          {symbol.symbol}
        </div>
      ))}
    </div>
  );
};

function EnhancedTrophy({ rank }) {
  const map = {
    1: { 
      bg: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500", 
      emoji: "🥇",
      glow: "shadow-yellow-500/50",
      border: "border-yellow-400/50"
    },
    2: { 
      bg: "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500", 
      emoji: "🥈",
      glow: "shadow-gray-400/50",
      border: "border-gray-400/50"
    },
    3: { 
      bg: "bg-gradient-to-br from-orange-400 via-orange-500 to-red-500", 
      emoji: "🥉",
      glow: "shadow-orange-500/50",
      border: "border-orange-400/50"
    },
  }[rank];
  if (!map) return null;
  return (
    <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${map.bg} ${map.glow} shadow-lg border ${map.border} text-xl transform hover:scale-110 transition-all duration-300`}>
      {map.emoji}
    </div>
  );
}

function MathematicalAvatar({ name, size = 56, rank }) {
  const initials = (name || "U").split(" ").slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");
  const colors = [
    "bg-gradient-to-br from-indigo-500 to-purple-600", 
    "bg-gradient-to-br from-emerald-500 to-teal-600", 
    "bg-gradient-to-br from-pink-500 to-rose-600", 
    "bg-gradient-to-br from-amber-500 to-orange-600", 
    "bg-gradient-to-br from-sky-500 to-blue-600", 
    "bg-gradient-to-br from-violet-500 to-purple-600"
  ];
  const idx = Math.abs(name ? name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 0) % colors.length;
  
  const isTopThree = rank <= 3;
  const glowClass = isTopThree ? 'shadow-lg shadow-blue-500/30' : 'shadow-md';
  
  return (
    <div 
      className={`${colors[idx]} text-white font-bold rounded-2xl flex items-center justify-center ${glowClass} border border-white/20 font-mono transform hover:scale-105 transition-all duration-300`} 
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials || "U"}
    </div>
  );
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
    <section className="relative overflow-hidden">
      <MathSymbolsAnimation />
      
      {/* Enhanced Mathematical Header */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🏆</span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white font-mono leading-tight">
                Season Rankings Matrix
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <p className="text-blue-200 font-mono text-sm">
                  ∀ player ∈ Season → Points.accumulate() → Rank.calculate()
                </p>
                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-400/30 rounded-full">
                  <span className="text-yellow-300 text-xs font-mono">LIVE RANKINGS</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-blue-300/80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Real-time Updates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>|Players| = {filtered.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Mathematical Precision</span>
            </div>
          </div>
        </div>

        {/* Enhanced Search Interface */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 min-w-[300px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">🔍</span>
            </div>
            <span className="text-white font-mono text-sm">Search Function</span>
          </div>
          <div className="relative">
            <input 
              value={q} 
              onChange={(e) => { setQ(e.target.value); setPage(1); }} 
              placeholder="filter(player.name)..." 
              className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-mono placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-sm" 
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path>
            </svg>
            {q && (
              <button 
                onClick={() => { setQ(""); setPage(1); }} 
                title="Clear Filter" 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-blue-300 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs text-blue-300/60 font-mono mt-2 text-center">
            Results: {filtered.length} ∈ Database
          </div>
        </div>
      </div>

      {/* Enhanced Mathematical Podium */}
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-4 gap-8 mb-8">
        <div className="xl:col-span-3 flex flex-col lg:flex-row items-stretch gap-6">
          {/* Champion's Throne - 1st Place */}
          {top3[0] ? (
            <div className="flex-1 relative bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-red-500/10 backdrop-blur-xl border border-yellow-400/30 p-8 rounded-3xl shadow-2xl overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-400/20 to-red-500/20 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">👑</span>
                  </div>
                  <span className="text-yellow-300 font-mono text-sm font-bold">CHAMPION</span>
                </div>
                
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <div className="relative">
                    <MathematicalAvatar name={top3[0].name} size={120} rank={1} />
                    <div className="absolute -top-2 -right-2">
                      <EnhancedTrophy rank={1} />
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
                      <div className="text-3xl font-bold text-white font-mono">{top3[0].name}</div>
                      <div className="text-sm text-yellow-300 font-mono">Rank[1] ∈ Champions</div>
                    </div>
                    <div className="text-blue-200 font-mono text-sm mb-4">
                      max(seasonPoints) = <span className="font-bold text-yellow-300">{top3[0].seasonPoints ?? 0}</span> points
                    </div>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm font-mono">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                        <span className="text-blue-200">Rating:</span>
                        <span className="text-white font-bold ml-2">{top3[0].rating ?? "N/A"}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                        <span className="text-blue-200">σ:</span>
                        <span className="text-white font-bold ml-2">±{top3[0].rd ?? "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-5xl font-bold text-yellow-300 font-mono mb-2">
                      {top3[0].seasonPoints ?? 0}
                    </div>
                    <div className="text-sm text-blue-200 font-mono">points</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-3xl text-center">
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👑</span>
              </div>
              <div className="text-blue-300/60 font-mono text-lg mb-2">
                Champion = ∅ (empty set)
              </div>
              <div className="text-blue-300/40 font-mono text-sm">
                Participate → Claim Throne
              </div>
            </div>
          )}

          {/* Silver & Bronze Pedestals */}
          <div className="lg:w-80 space-y-4">
            {top3.slice(1, 3).map((p, idx) => {
              const rank = idx + 2;
              const isSecond = rank === 2;
              return (
                <div 
                  key={p._id || idx} 
                  className={`group relative p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
                    isSecond 
                      ? 'bg-gradient-to-br from-gray-400/20 to-gray-500/15 border-gray-400/40' 
                      : 'bg-gradient-to-br from-orange-500/20 to-red-500/15 border-orange-400/40'
                  }`}
                >
                  {/* Decorative blur */}
                  <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl ${
                    isSecond ? 'bg-gray-400/20' : 'bg-orange-400/20'
                  }`}></div>
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <MathematicalAvatar name={p.name} size={64} rank={rank} />
                        <div className="absolute -top-1 -right-1">
                          <EnhancedTrophy rank={rank} />
                        </div>
                      </div>
                      <div>
                        <div className="text-white font-mono font-bold text-lg">{p.name}</div>
                        <div className="text-xs text-blue-300/80 font-mono">
                          Rank[{rank}] ∈ Podium
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold font-mono ${
                        isSecond ? 'text-gray-300' : 'text-orange-300'
                      }`}>
                        {p.seasonPoints ?? 0}
                      </div>
                      <div className="text-xs text-blue-300/60 font-mono">points</div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Empty slots for missing podium positions */}
            {top3.length < 3 && Array.from({ length: Math.max(0, 3 - top3.length) }).map((_, i) => {
              const rank = top3.length + i + 1;
              return (
                <div key={`empty-${i}`} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">{rank === 2 ? '🥈' : '🥉'}</span>
                  </div>
                  <div className="text-blue-300/60 font-mono text-sm">
                    Position[{rank}] = ∅
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhanced Top 10 Preview */}
        <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/15 backdrop-blur-xl border border-white/30 p-6 rounded-3xl shadow-2xl overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-400/15 to-pink-500/15 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📊</span>
              </div>
              <h4 className="text-lg font-bold text-white font-mono">Top 10 Matrix</h4>
            </div>
            
            <div className="space-y-3">
              {filtered.slice(0, 10).map((p, i) => (
                <div key={p._id || i} className="group bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        i < 3 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : 'bg-blue-500/30 text-blue-300'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="text-white font-mono text-sm font-medium">{p.name}</div>
                    </div>
                    <div className="text-blue-300 font-mono text-sm font-bold">
                      {p.seasonPoints ?? 0}
                    </div>
                  </div>
                </div>
              ))}
              
              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">📈</span>
                  </div>
                  <div className="text-blue-300/60 font-mono text-sm">
                    Rankings = ∅ (empty set)
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-xs text-blue-300/60 font-mono text-center">
              Top10 ⊂ AllPlayers
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Mathematical Player Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {pageItems.map((p, i) => {
          const globalIndex = (page - 1) * perPage + i;
          const rank = globalIndex + 1;
          const isMe = (currentUserId && String(currentUserId) === String(p._id)) || (currentUserName && currentUserName === p.name);
          const topThree = rank <= 3;
          
          return (
            <article 
              key={p._id || i} 
              className={`group relative backdrop-blur-sm border p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden ${
                topThree 
                  ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/15 border-yellow-400/40" 
                  : isMe 
                    ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border-blue-400/40" 
                    : "bg-white/10 border-white/20 hover:bg-white/15"
              }`}
            >
              {/* Decorative blur for special ranks */}
              {(topThree || isMe) && (
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl ${
                  topThree ? 'bg-yellow-400/20' : 'bg-blue-400/20'
                }`}></div>
              )}
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <MathematicalAvatar name={p.name} size={64} rank={rank} />
                    {topThree && (
                      <div className="absolute -top-1 -right-1">
                        <EnhancedTrophy rank={rank} />
                      </div>
                    )}
                    {isMe && !topThree && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">★</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-mono font-bold text-lg">{p.name}</div>
                    <div className="text-xs text-blue-300/80 font-mono">
                      Rank[{rank}] {isMe ? '← You' : topThree ? '∈ Elite' : '∈ Players'}
                    </div>
                    {p.rating && (
                      <div className="text-xs text-blue-300/60 font-mono mt-1">
                        Rating: {p.rating} ±{p.rd ?? 0}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold font-mono ${
                    topThree ? 'text-yellow-300' : isMe ? 'text-blue-300' : 'text-white'
                  }`}>
                    {p.seasonPoints ?? 0}
                  </div>
                  <div className="text-xs text-blue-300/60 font-mono">points</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Enhanced Mathematical Pagination */}
      <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-blue-200 font-mono">
            <span className="text-white font-bold">Display Range:</span> [{(page - 1) * perPage + 1}, {Math.min(filtered.length, page * perPage)}] ⊂ [1, {filtered.length}]
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => goto(page - 1)} 
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105" 
              disabled={page <= 1}
            >
              ← Prev()
            </button>
            
            <div className="flex items-center gap-2">
              <div className="text-sm px-4 py-2 rounded-xl bg-blue-500/30 border border-blue-400/50 text-blue-300 font-mono font-bold">
                {page} / {totalPages}
              </div>
            </div>
            
            <button 
              onClick={() => goto(page + 1)} 
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105" 
              disabled={page >= totalPages}
            >
              Next() →
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-blue-300/60 font-mono text-center">
          Page Navigation: f(page) → [1, {totalPages}] ∈ ℕ
        </div>
      </div>

      {/* Enhanced CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </section>
  );
}
