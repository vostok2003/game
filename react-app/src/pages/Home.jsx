// src/pages/Home.jsx
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import getSocket from "../socket";
const socket = getSocket();
import { UserContext } from "../context/UserContext";
import { fetchToday, fetchSectionProblems, fetchDailyLeaderboard, fetchStreak } from "../services/dailyService";
import WeeklyContest from "../components/WeeklyContest";

// Mathematical Symbols Animation Component
const MathSymbolsAnimation = () => {
  const [symbols, setSymbols] = useState([]);
  
  const mathSymbols = ['∑', '∫', '∆', '∞', 'π', '√', '∂', '∇', '∈', '∀', '∃', '⊂', '⊃', '∪', '∩', '≡', '≠', '≤', '≥', '±', '×', '÷', '∝', '∴', '∵', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω'];

  useEffect(() => {
    const createSymbol = () => ({
      id: Math.random(),
      left: Math.random() * 100,
      animationDuration: Math.random() * 8 + 5,
      opacity: Math.random() * 0.15 + 0.05,
      size: Math.random() * 15 + 10,
      symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
      rotation: Math.random() * 360,
    });

    const initialSymbols = Array.from({ length: 8 }, createSymbol);
    setSymbols(initialSymbols);

    const interval = setInterval(() => {
      setSymbols(prev => {
        const newSymbols = [...prev];
        if (newSymbols.length < 12) {
          newSymbols.push(createSymbol());
        }
        return newSymbols;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {symbols.map((symbol) => (
        <div
          key={symbol.id}
          className="absolute animate-float text-blue-200/20 font-bold select-none"
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

// Mathematical Grid Background
const MathGridBackground = () => {
  return (
    <div className="fixed inset-0 opacity-5 z-0">
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />
    </div>
  );
};

const gameModes = [
  { label: "1 Minute", value: 1 },
  { label: "2 Minutes", value: 2 },
  { label: "3 Minutes", value: 3 },
  { label: "5 Minutes", value: 5 },
];

export default function Home() {
  const { user } = useContext(UserContext);
  const name = user?.name || "";
  const [mode, setMode] = useState(1);
  const [room, setRoom] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const navigate = useNavigate();
  
  // Daily practice states
  const [dailySections, setDailySections] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sampleProblems, setSampleProblems] = useState([]);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  const [streak, setStreak] = useState({ currentStreak: 0, days: [] });

  useEffect(() => {
    // Listen for live leaderboard updates
    function handleLeaderboardUpdate(top) {
      setLeaderboard(top || []);
    }
    socket.on("leaderboardUpdate", handleLeaderboardUpdate);

    // Debug fetch: read text then parse JSON to show raw response on failure
    async function fetchLeaderboard() {
      try {
        const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const url = `${baseURL}/api/leaderboard`;
        console.log("[Leaderboard] fetching", url);
        const res = await fetch(url, { 
          credentials: "include", 
          headers: { 
            Accept: "application/json",
            'Content-Type': 'application/json'
          } 
        });

        console.log("[Leaderboard] status:", res.status, res.statusText);
        console.log("[Leaderboard] content-type:", res.headers.get("content-type"));

        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setLeaderboard(data.top || []);
          console.log("[Leaderboard] parsed JSON:", data);
        } catch (err) {
          console.error("[Leaderboard] response was not valid JSON. Raw response:\n", text);
          // fall back to empty list so UI doesn't break
          setLeaderboard([]);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
        setLeaderboard([]);
      } finally {
        setLoadingLeaderboard(false);
      }
    }

    fetchLeaderboard();
    loadDailyData();

    return () => {
      socket.off("leaderboardUpdate", handleLeaderboardUpdate);
    };
  }, []);
  
  // Load all daily practice data
  async function loadDailyData() {
    setLoadingDaily(true);
    try {
      // Fetch today's sections
      const todayData = await fetchToday();
      setDailySections(todayData.sections || []);
      
      // Set default selected section (first unlocked one)
      const firstUnlocked = todayData.sections.find(s => s.unlocked);
      if (firstUnlocked) {
        setSelectedSection(firstUnlocked);
        
        // Load sample problems for the selected section
        await loadSectionProblems(todayData.date, firstUnlocked.key);
        
        // Load daily leaderboard for this section
        await loadDailyLeaderboard(todayData.date, firstUnlocked.key);
      }
      
      // Load user streak if authenticated
      if (user) {
        try {
          const streakData = await fetchStreak();
          setStreak(streakData);
        } catch (err) {
          console.error("Failed to fetch streak", err);
        }
      }
    } catch (err) {
      console.error("Failed to load daily data", err);
    } finally {
      setLoadingDaily(false);
    }
  }
  
  async function loadSectionProblems(date, sectionKey) {
    try {
      const data = await fetchSectionProblems(date, sectionKey);
      // Only show first 3 problems as sample
      setSampleProblems(data.questions.slice(0, 3));
    } catch (err) {
      console.error("Failed to load section problems", err);
      setSampleProblems([]);
    }
  }
  
  async function loadDailyLeaderboard(date, sectionKey) {
    try {
      const data = await fetchDailyLeaderboard(date, sectionKey, 3); // Only top 3
      setDailyLeaderboard(data.top || []);
    } catch (err) {
      console.error("Failed to load daily leaderboard", err);
      setDailyLeaderboard([]);
    }
  }
  
  async function handleSectionSelect(section) {
    setSelectedSection(section);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    await loadSectionProblems(date, section.key);
    await loadDailyLeaderboard(date, section.key);
  }

  const handleCreate = () => {
    socket.emit("createRoom", { mode }, ({ roomCode, players, error }) => {
      if (error) {
        alert(error);
        return;
      }
      navigate("/waiting", { state: { roomCode, players, name, isHost: true } });
    });
  };

  const handleJoin = () => {
    socket.emit("joinRoom", { roomCode: room }, ({ roomCode, players, error }) => {
      if (error) {
        alert(error);
        return;
      }
      navigate("/waiting", { state: { roomCode, players, name, isHost: false } });
    });
  };

  const handleSinglePlayer = () => {
    navigate("/singleplayer", { state: { mode } });
  };
  
  const handleOpenDaily = () => {
    navigate("/daily");
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-x-hidden">
      {/* Mathematical Background Elements */}
      <MathGridBackground />
      <MathSymbolsAnimation />
      
      {/* Hero Section with Floating Elements */}
      <div className="relative z-10">
        {/* Floating Geometric Shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-60 left-1/3 w-16 h-16 bg-cyan-500/10 rounded-full blur-lg animate-pulse delay-2000"></div>
        
        {/* Main Content Container */}
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Enhanced Hero Header */}
          <div className="relative bg-gradient-to-r from-white/15 via-white/10 to-white/15 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl mb-8 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-2xl">∑</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"></div>
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white font-mono leading-tight">
                      Welcome{user?.name ? ` ${user.name}` : ""}
                      <span className="text-blue-300">!</span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <p className="text-blue-200 font-mono text-lg">
                        ∀ problems ∈ MathBlitz → solve(problem) = success
                      </p>
                      <div className="px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full">
                        <span className="text-green-300 text-sm font-mono">ONLINE</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-blue-300/80">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Session.active = true</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Mode: {user ? 'authenticated' : 'guest'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Time: {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Rating Card */}
                <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/30 min-w-[200px]">
                  <div className="text-center">
                    <div className="text-sm text-blue-200 font-mono mb-2">Rating Function</div>
                    <div className="text-3xl font-bold text-white font-mono mb-2">
                      {user?.rating ?? 1500}
                    </div>
                    <div className="text-xs text-blue-300/80 font-mono mb-3">
                      σ = ±{user?.rd ?? 350}
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, ((user?.rating ?? 1500) / 2500) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-blue-300/60 font-mono">
                      Rank ≈ {user?.rating ? Math.max(1, Math.floor((2000 - user.rating) / 50) + 1) : 'N/A'}
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/30 min-w-[200px]">
                  <div className="text-center">
                    <div className="text-sm text-blue-200 font-mono mb-2">Quick Stats</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-mono">
                        <span className="text-blue-300">Streak:</span>
                        <span className="text-green-300">{streak.currentStreak || 0} days</span>
                      </div>
                      <div className="flex justify-between text-sm font-mono">
                        <span className="text-blue-300">Confidence:</span>
                        <span className="text-yellow-300">{Math.round((1 - (user?.rd ?? 350) / 500) * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm font-mono">
                        <span className="text-blue-300">Status:</span>
                        <span className="text-purple-300">{user ? 'Verified' : 'Guest'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Actions Card */}
                {user && (
                  <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/30 min-w-[200px]">
                    <div className="text-center">
                      <div className="text-sm text-blue-200 font-mono mb-4">User Actions</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm font-mono text-blue-300 mb-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span>Session Active</span>
                        </div>
                        <button
                          onClick={() => {
                            // Clear user context and redirect to login
                            localStorage.removeItem('token');
                            window.location.href = '/login';
                          }}
                          className="w-full bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-red-400/30 hover:from-red-500/30 hover:to-pink-500/30 text-red-300 hover:text-red-200 px-4 py-3 rounded-xl transition-all font-mono font-medium transform hover:scale-105 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>🚪</span>
                            <span>Logout()</span>
                          </div>
                        </button>
                        <div className="text-xs text-red-300/60 font-mono mt-2">
                          End Session → Clear Auth
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        
          {/* Weekly Contest Section - Enhanced */}
          <div className="mb-8">
            <WeeklyContest />
          </div>
        
          {/* Mathematical Daily Practice Panel - Enhanced */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl shadow-2xl mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">∫</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white font-mono">Daily Practice</h2>
                </div>
                <p className="text-blue-200 font-mono text-sm mt-1">
                  ∀ day ∈ Calendar → unlock(problems) ∧ build(streak)
                </p>
                <div className="text-xs font-mono text-blue-300/60 mt-1">
                  Set Theory: Same problems ∀ users | Practice Points ∈ ℕ
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-xs text-blue-200 font-mono">Date Function</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {new Date().toLocaleDateString()}
                  </div>
                
                </div>
              </div>
            </div>

            {loadingDaily ? (
              <div className="mt-4 text-center py-8">
                <div className="text-blue-200 font-mono">Computing daily practice...</div>
                <div className="text-xs text-blue-300/60 font-mono mt-2">∫ problems dx = loading...</div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-blue-200 font-mono mb-3">Available Sections → S = {"{"}s₁, s₂, s₃, s₄{"}"}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {dailySections.map((section, index) => (
                          <button 
                            key={section.key}
                            onClick={() => handleSectionSelect(section)}
                            className={`text-left px-3 py-3 ${selectedSection?.key === section.key ? 'bg-blue-500/20 border-blue-400' : 'bg-white/10 border-white/20'} border rounded-xl hover:bg-blue-500/30 transition-all ${!section.unlocked ? 'opacity-40 cursor-not-allowed' : ''} backdrop-blur-sm`}
                            disabled={!section.unlocked}
                          >
                            <div className="text-white font-mono font-medium">{section.title}</div>
                            <div className="text-xs text-blue-300/80 font-mono mt-1">
                              {section.key === 'basic' ? 'Domain: ∀ users' : 
                               section.key === 'intermediate' ? 'Rating ≥ 1600' : 
                               section.key === 'advanced' ? 'Rating ≥ 1800' : 'Rating ≥ 1900'}
                            </div>
                            <div className="text-xs text-blue-400/60 font-mono mt-1">
                              Section[{index}] = {section.unlocked ? 'unlocked' : 'locked'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="w-40">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="text-sm text-blue-200 font-mono">Streak Function</div>
                        <div className="text-3xl font-bold text-green-400 font-mono">{streak.currentStreak || 0}</div>
                        <div className="text-xs text-blue-300/60 font-mono mt-1">consecutive days</div>
                        <div className="text-xs text-green-300/80 font-mono mt-2">
                          f(days) = {streak.currentStreak || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/20 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-blue-200 font-mono">Sample Problems → P(x)</div>
                      <div className="text-xs text-blue-300/60 font-mono">
                        {selectedSection ? `|P| = ${sampleProblems.length} · ${selectedSection.title}` : 'Select section ∈ S'}
                      </div>
                    </div>

                    {sampleProblems.length > 0 ? (
                      <div className="space-y-2">
                        {sampleProblems.map((problem, index) => (
                          <div key={index} className="flex items-center justify-between bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                            <div className="text-white font-mono">{problem}</div>
                            <div className="text-sm text-blue-300/80 font-mono">f({index + 1}) = ?</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-blue-200 bg-white/5 rounded-xl border border-white/10">
                        <div className="font-mono">
                          {selectedSection && !selectedSection.unlocked 
                            ? '∅ Section locked → rating < threshold'
                            : selectedSection 
                              ? '∅ No problems in current set'
                              : 'Select s ∈ S to view P(s)'}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-mono"
                        onClick={handleOpenDaily}
                      >
                        Execute Daily()
                      </button>
                      <button 
                        className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-all font-mono"
                        onClick={() => navigate('/daily')}
                      >
                        View Leaderboard[]
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-sm text-blue-200 font-mono mb-3">Daily Leaderboard → L(today)</div>
                  {dailyLeaderboard.length > 0 ? (
                    <div className="space-y-2">
                      {dailyLeaderboard.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="text-white font-mono">
                            [{index + 1}] {entry.user.name}
                          </div>
                          <div className="text-blue-300 font-mono">{entry.practicePoints}pts</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-blue-300/60 py-4 font-mono">
                      L = ∅ (empty set)
                    </div>
                  )}
                  <div className="mt-4 text-xs text-blue-300/60 font-mono">Updated: ∀ day ∈ Calendar</div>
                </div>
              </div>
            )}
          </div>


          {/* Main Action Section - Enhanced Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Mathematical Game Controls - Enhanced */}
            <div className="xl:col-span-3 bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-orange-400/10 to-red-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-yellow-400/10 to-orange-500/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">∏</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white font-mono">Game Functions</h2>
                    <p className="text-blue-200 font-mono text-sm mt-1">
                      Create(room) ∨ Join(room) ∨ SinglePlayer(mode) → GameState
                    </p>
                  </div>
                </div>

                {/* Multiplayer Section */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <h3 className="text-lg font-bold text-white font-mono">Multiplayer Mode</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-blue-200 mb-3 font-mono text-sm">Time Domain ∈ Minutes</label>
                      <select 
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        value={mode} 
                        onChange={(e) => setMode(Number(e.target.value))}
                      >
                        {gameModes.map((m) => <option key={m.value} value={m.value} className="bg-slate-800 text-white">{m.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-blue-200 mb-3 font-mono text-sm">Room Code → String</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-blue-300/60" 
                        value={room} 
                        onChange={(e) => setRoom(e.target.value)} 
                        placeholder="Enter room ID or leave ∅" 
                      />
                    </div>

                    <div className="flex gap-3">
                      <button 
                        className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all font-mono font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                        onClick={handleCreate}
                      >
                        Create()
                      </button>
                      <button 
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-mono font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                        onClick={room ? handleJoin : () => alert('Room code required: room ≠ ∅')}
                      >
                        Join()
                      </button>
                    </div>
                  </div>
                </div>

                {/* Single Player Section */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <h3 className="text-lg font-bold text-white font-mono">Single Player Mode</h3>
                  </div>
                  <p className="text-blue-200 font-mono text-sm mb-4">
                    Practice(user, time) → score ∉ multiplayer_leaderboard
                  </p>
                  <div className="flex gap-4 items-center">
                    <button 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-mono font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                      onClick={handleSinglePlayer}
                    >
                      Execute Practice()
                    </button>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                      <div className="text-sm text-blue-300 font-mono">
                        Duration: {mode} minute{mode !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Mathematical Leaderboard */}
            <div className="bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-xl border border-white/30 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-yellow-400/10 to-orange-500/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">Σ</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white font-mono">Global Leaderboard</h2>
                    <div className="text-xs text-blue-300/60 font-mono mt-1">
                      Sorted by: rating DESC | ∀ players ∈ Database
                    </div>
                  </div>
                </div>
              
              {loadingLeaderboard ? (
                <div className="text-blue-200 font-mono text-center py-8">
                  <div>Computing rankings...</div>
                  <div className="text-xs text-blue-300/60 mt-2">∑ players = loading...</div>
                </div>
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs text-blue-200 font-mono pb-2 border-b border-white/20">
                      <div className="col-span-2">Rank</div>
                      <div className="col-span-6">Player</div>
                      <div className="col-span-4">Rating</div>
                    </div>
                    {leaderboard.length === 0 && (
                      <div className="py-8 text-center text-blue-300/60 font-mono">
                        Players = ∅ (empty set)
                      </div>
                    )}
                    {leaderboard.map((p, i) => (
                      <div 
                        key={p._id || p.name || i} 
                        className={`grid grid-cols-12 gap-2 py-2 px-3 rounded-xl transition-all ${user && (String(user._id) === String(p._id) || user.name === p.name) ? "bg-blue-500/20 border border-blue-400/50" : "bg-white/5 hover:bg-white/10"}`}
                      >
                        <div className="col-span-2 text-white font-mono font-bold">#{i + 1}</div>
                        <div className="col-span-6 text-white font-mono truncate">{p.name}</div>
                        <div className="col-span-4 text-blue-300 font-mono">{p.rating}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
                <div className="mt-6 text-xs text-blue-300/60 font-mono text-center bg-white/5 rounded-xl p-3 border border-white/10">
                  |Leaderboard| = {leaderboard.length} players
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced CSS for animations and effects */}
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
            
            /* Additional smooth animations */
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }
            
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .animate-fadeInUp {
              animation: fadeInUp 0.6s ease-out;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
