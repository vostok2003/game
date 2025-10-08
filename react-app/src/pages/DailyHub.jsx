// client/src/pages/DailyHub.jsx
import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import {
  fetchToday,
  fetchSectionProblems,
  submitDailyAttempt,
  fetchDailyLeaderboard,
  fetchSeasonLeaderboard,
  fetchStreak,
  fetchComments,
} from "../services/dailyService";
import StreakCalendar from "../components/StreakCalendar";
import Discussion from "../components/Discussion";
import SeasonLeaderboard from "../components/SeasonLeaderboard";
import { toast } from "react-toastify";
import getSocket from "../socket";

const socket = getSocket();

export default function DailyHub() {
  const { user } = useContext(UserContext);
  const [today, setToday] = useState(null);
  const [selected, setSelected] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [seasonTop, setSeasonTop] = useState([]);
  const [streak, setStreak] = useState({ currentStreak: 0, days: [] });
  const [comments, setComments] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const navigate = useNavigate();

  // calendar clicked day details
  const [pickedDay, setPickedDay] = useState(null); // { date, solved, inRange }

  useEffect(() => {
    loadToday();
    loadStreak();
    loadSeason();

    // listen for optional real-time season updates (backend must emit "seasonUpdate")
    function onSeasonUpdate(payload) {
      // server can optionally send { year, month } or nothing
      loadSeason();
    }
    socket.on("seasonUpdate", onSeasonUpdate);

    return () => {
      socket.off("seasonUpdate", onSeasonUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadToday() {
    setLoadingDaily(true);
    try {
      const res = await fetchToday();
      setToday(res);
    } catch (err) {
      console.error("loadToday error", err);
    } finally {
      setLoadingDaily(false);
    }
  }

  async function loadStreak() {
    try {
      if (!user) {
        setStreak({ currentStreak: 0, days: [] });
        return;
      }
      const res = await fetchStreak();
      if (res) setStreak(res);
    } catch (err) {
      console.error("Failed to fetch streak", err);
      setStreak({ currentStreak: 0, days: [] });
    }
  }

  async function loadSeason() {
    const now = new Date();
    try {
      // fetchSeasonLeaderboard already adds cache-buster param
      const res = await fetchSeasonLeaderboard(now.getUTCFullYear(), now.getUTCMonth() + 1);
      setSeasonTop(res.top || []);
    } catch (err) {
      console.error("loadSeason error", err);
      setSeasonTop([]);
    }
  }

  async function openSection(key) {
    if (!today) return;
    try {
      const res = await fetchSectionProblems(today.date, key);
      setSelected({ key, date: today.date });
      setQuestions(res.questions || []);
      setAnswers(res.questions.map(() => ({ answer: "", timeMs: 0 })));
      const lb = await fetchDailyLeaderboard(today.date, key);
      setLeaderboard(lb.top || []);
      const cm = await fetchComments(today.date, key);
      setComments(cm.comments || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to open section. Are you logged in and the section unlocked?");
    }
  }

  function setAnswerAt(index, value) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], answer: value };
      return next;
    });
  }

  async function handleSubmit() {
    if (!selected) return;
    const payload = { date: selected.date, sectionKey: selected.key, answers };
    try {
      const res = await submitDailyAttempt(payload);
      toast.success(`Submitted — +${res.practicePoints || 0} practice points`);
      if (res.awardedBadges && res.awardedBadges.length) {
        toast.info(`Badges: ${res.awardedBadges.join(", ")}`, { autoClose: 4000 });
      }

      // refresh right-side info
      const lb = await fetchDailyLeaderboard(selected.date, selected.key);
      setLeaderboard(lb.top || []);

      // critical: reload streak and season (season fetch includes cache-buster)
      await loadStreak();
      await loadSeason();

      // Additionally, if you want immediate UI reflect without roundtrip, you could
      // optimistically update seasonTop here (not done by default).
    } catch (err) {
      console.error("submitDailyAttempt failed", err);
      const msg = err.response?.data?.error || err.message || "Submit failed";
      toast.error(msg);
      alert(msg);
    }
  }

  // calendar click handler
  const handleCalendarClick = async (dateIso, info) => {
    setPickedDay(info);
    // Optionally fetch attempts/comments for that date to show details (non-blocking)
    try {
      if (selected) {
        const lb = await fetchDailyLeaderboard(dateIso, selected.key);
        setLeaderboard(lb.top || []);
      }
      const cm = await fetchComments(dateIso, selected?.key || "basic");
      setComments(cm.comments || []);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Mesh Background */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 25%),
            radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.15) 0%, transparent 25%),
            radial-gradient(circle at 40% 60%, rgba(59, 130, 246, 0.15) 0%, transparent 25%)
          `,
          backgroundSize: '100% 100%',
          animation: 'pulse 15s ease-in-out infinite alternate'
        }}></div>
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)'
        }}></div>
        
        {/* Floating Mathematical Symbols */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => {
            const symbols = ['∑', '∫', '∆', '∞', 'π', '√', '∂', '∇', '∈', '∀', '∃', '⊂', '⊃', '∪', '∩'];
            const size = Math.random() * 3 + 1;
            const duration = Math.random() * 20 + 20;
            const delay = Math.random() * 5;
            const opacity = Math.random() * 0.05 + 0.01;
            const top = Math.random() * 100;
            const left = Math.random() * 100;
            const rotate = Math.random() * 360;
            
            return (
              <div 
                key={i}
                className="absolute text-blue-200/20 font-bold pointer-events-none select-none"
                style={{
                  fontSize: `${size}rem`,
                  top: `${top}%`,
                  left: `${left}%`,
                  opacity: opacity,
                  transform: `rotate(${rotate}deg)`,
                  animation: `float ${duration}s ease-in-out ${delay}s infinite`
                }}
              >
                {symbols[i % symbols.length]}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Custom Scrollbar */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.8);
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); }
          50% { transform: translate(20px, 20px) rotate(var(--rotate, 0deg)); }
        }
        @keyframes pulse {
          0% { opacity: 0.1; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(1.05); }
        }
        .glow {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
        }
        .glow-hover:hover {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
        }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Enhanced Mathematical Header */}
        <div className="relative bg-gray-800 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-2xl mb-8 overflow-hidden transition-all duration-500 hover:border-gray-600">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/10 rounded-full -ml-16 -mb-16"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full"></div>
          
          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-105">
                    <span className="text-white font-bold text-3xl">📚</span>
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => navigate('/')}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/30 transition-all duration-200 flex items-center justify-center text-blue-300 hover:text-white"
                          title="Back to Home"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <h1 className="text-4xl md:text-5xl font-bold text-white font-mono">
                          Daily Practice Hub
                        </h1>
                      </div>
                      <div className="px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full w-fit">
                        <span className="text-green-300 text-xs font-mono">DAILY ACTIVE</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-blue-200 font-mono text-sm inline-block px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        ∀ day ∈ Calendar → Problems.unlock() ∧ Streak.build() → Leaderboard.climb()
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-blue-300/80 mt-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Daily.unlock() = automatic</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Streak: <span className="text-white font-bold">{streak.currentStreak}</span> days</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Global Competition</span>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Rating Card */}
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/20 min-w-[220px] transform transition-all duration-300 hover:scale-105 hover:border-white/30 hover:shadow-lg hover:shadow-blue-500/20">
                <div className="text-center">
                  <div className="text-sm text-blue-200 font-mono mb-2 flex items-center justify-center gap-2">
                    <span>Rating Function</span>
                    <span className="text-xs text-blue-300/50">f(x) =</span>
                  </div>
                  <div className="text-4xl font-bold text-white font-mono mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
                    {user?.rating ?? 1500}
                  </div>
                  <div className="text-xs text-blue-300/80 font-mono mb-3">
                    σ = ±{user?.rd ?? 350}
                  </div>
                  <div className="relative w-full bg-white/10 rounded-full h-2.5 mb-3 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, ((user?.rating ?? 1500) / 2500) * 100)}%` }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                  </div>
                  <div className="text-xs text-blue-300/60 font-mono">
                    Rank ≈ {user?.rating ? Math.max(1, Math.floor((2000 - user.rating) / 50) + 1) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative Bottom Border */}
          <div className="h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
        </div>

        {/* Mathematical Streak Calendar */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-indigo-900/30 via-gray-900/80 to-blue-900/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:border-white/30 hover:shadow-2xl hover:shadow-indigo-500/20">
            {/* Mathematical Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg glow-hover transition-all duration-300 transform hover:scale-105">
                    <span className="text-white text-3xl">∑</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-mono bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-blue-300">
                      <span className="font-math">S</span>treak <span className="font-math">M</span>atrix
                    </h2>
                    <div className="text-xs md:text-sm text-blue-300/70 font-mono mt-1 flex flex-wrap items-center gap-1">
                      <span>Let <span className="font-math">S</span> = <span className="text-indigo-300">∫</span> consistency(t)dt</span>
                      <span className="text-purple-300">→</span>
                      <span>where <span className="text-pink-300 font-math">t</span> ∈ [start, now]</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 min-w-[240px]">
                  <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-indigo-500/20">
                    <div className="text-xs text-blue-300/80 font-mono">Current Streak</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-white">{streak.currentStreak}</span>
                      <span className="text-xs text-blue-300/60">days</span>
                      <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-indigo-500/20">
                    <div className="text-xs text-blue-300/80 font-mono">Success Rate</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-white">{streak.days.filter(d => d.count > 0).length}</span>
                      <span className="text-xs text-blue-300/60">/ {streak.days.length}</span>
                      <span className="ml-auto text-xs text-blue-300/60">
                        {Math.round((streak.days.filter(d => d.count > 0).length / streak.days.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-indigo-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10 overflow-hidden">
                {/* Mathematical Grid Overlay */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgIDxwYXRoIGQ9Ik0yMCAwaC0yMHYyMGgyMHoiLz4KICAgIDxwYXRoIGQ9Ik0xIDB2MjAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8cGF0aCBkPSJNMSAwaDE4IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPgogIDwvZz4KPC9zdmc+')] opacity-30"></div>
                </div>
                
                <div className="relative z-10">
                  <StreakCalendar
                    days={streak.days}
                    yearsCount={3}
                    cellSize={16}
                    cellGap={4}
                    monthGapPx={20}
                    onDayClick={(iso, meta) => handleCalendarClick(iso, meta)}
                  />
                </div>
                
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
                  <div className="flex flex-col items-center p-3 bg-indigo-900/30 rounded-xl border border-indigo-500/20">
                    <div className="w-3 h-3 bg-emerald-500/80 rounded-sm mb-1.5"></div>
                    <span className="text-xs text-center text-blue-200 font-mono">
                      Solved
                      <br/>
                      <span className="text-indigo-300">(∀x ∈ S, x &gt; 0)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-indigo-900/30 rounded-xl border border-indigo-500/20">
                    <div className="w-3 h-3 bg-red-500/80 rounded-sm mb-1.5"></div>
                    <span className="text-xs text-center text-blue-200 font-mono">
                      Missed
                      <br/>
                      <span className="text-indigo-300">(x = 0)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-indigo-900/30 rounded-xl border border-indigo-500/20">
                    <div className="w-3 h-3 bg-white/10 rounded-sm border border-white/20 mb-1.5"></div>
                    <span className="text-xs text-center text-blue-200 font-mono">
                      Upcoming
                      <br/>
                      <span className="text-indigo-300">(x ∉ domain)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-indigo-900/30 rounded-xl border border-indigo-500/20">
                    <div className="w-3 h-3 bg-blue-500/50 rounded-sm mb-1.5"></div>
                    <span className="text-xs text-center text-blue-200 font-mono">
                      Today
                      <br/>
                      <span className="text-indigo-300">(x = t)</span>
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-xs text-blue-300/60 font-mono">
                    <span>ℹ️ Streak Analysis:</span>
                    <span>Longest: {Math.max(...streak.days.map(d => d.streakCount))}d</span>
                    <span>•</span>
                    <span>Total: {streak.days.filter(d => d.count > 0).length}d</span>
                    <span>•</span>
                    <span>Consistency: {Math.round((streak.days.filter(d => d.count > 0).length / streak.days.length) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mathematical Bottom Border */}
            <div className="h-1 bg-gradient-to-r from-transparent via-indigo-500/30 via-30% to-transparent"></div>
          </div>
        </div>

        {/* Enhanced Season Leaderboard */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/15 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-yellow-400/15 to-orange-500/15 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-blue-400/10 to-purple-500/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl">🏆</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-mono bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-300">
                      Season Leaderboard
                    </h2>
                    <div className="text-xs md:text-sm text-blue-300/70 font-mono mt-1 flex items-center gap-2">
                      <span>Monthly.compete()</span>
                      <span className="text-yellow-300">→</span>
                      <span>Rankings.global()</span>
                      <span className="text-yellow-300">→</span>
                      <span className="text-yellow-300 font-semibold">Champions.emerge()</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-200 font-mono">
                    Live Rankings • {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                {/* Podium for Top 3 */}
                {seasonTop.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* 2nd Place */}
                    {seasonTop[1] && (
                      <div className="flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
                        <div className="relative w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-2xl flex items-end justify-center overflow-hidden">
                          <div className="absolute -top-2 right-2 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            2
                          </div>
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-white/90 rounded-full mb-2 flex items-center justify-center text-3xl">
                            {seasonTop[1].name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="w-full bg-white/10 backdrop-blur-sm p-3 rounded-b-2xl text-center">
                          <div className="font-bold text-white truncate">{seasonTop[1].name}</div>
                          <div className="text-yellow-300 font-mono text-sm">{seasonTop[1].seasonPoints || 0} pts</div>
                        </div>
                      </div>
                    )}
                    
                    {/* 1st Place */}
                    {seasonTop[0] && (
                      <div className="flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
                        <div className="relative w-28 h-32 md:w-32 md:h-36 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-t-2xl flex items-end justify-center overflow-hidden -mt-6">
                          <div className="absolute -top-2 right-2 w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            👑
                          </div>
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-white/90 rounded-full mb-2 flex items-center justify-center text-4xl shadow-lg">
                            {seasonTop[0].name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="w-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm p-4 rounded-b-2xl text-center border-t-2 border-yellow-400/50">
                          <div className="font-bold text-yellow-200 text-lg truncate">{seasonTop[0].name}</div>
                          <div className="text-yellow-300 font-mono font-bold text-lg">{seasonTop[0].seasonPoints || 0} pts</div>
                        </div>
                      </div>
                    )}
                    
                    {/* 3rd Place */}
                    {seasonTop[2] && (
                      <div className="flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
                        <div className="relative w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-amber-600 to-amber-800 rounded-t-2xl flex items-end justify-center overflow-hidden">
                          <div className="absolute -top-2 right-2 w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            3
                          </div>
                          <div className="w-14 h-14 md:w-16 md:h-16 bg-white/90 rounded-full mb-2 flex items-center justify-center text-2xl">
                            {seasonTop[2].name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="w-full bg-white/10 backdrop-blur-sm p-3 rounded-b-2xl text-center">
                          <div className="font-bold text-white truncate">{seasonTop[2].name}</div>
                          <div className="text-yellow-300 font-mono text-sm">{seasonTop[2].seasonPoints || 0} pts</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Leaderboard Table */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider font-mono">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider font-mono">Player</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider font-mono">Points</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider font-mono">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {seasonTop.slice(3, 10).map((player, index) => (
                          <tr 
                            key={player._id} 
                            className={`transition-colors duration-200 ${
                              String(player._id) === String(user?._id) 
                                ? 'bg-gradient-to-r from-blue-500/10 to-transparent' 
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-200 font-mono">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 ${
                                index < 3 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-white/10 text-blue-200'
                              }`}>
                                {index + 4}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white font-medium">
                                  {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-white">{player.name}</div>
                                  <div className="text-xs text-blue-300/70 font-mono">
                                    {String(player._id) === String(user?._id) ? 'You' : 'Player'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-bold text-yellow-300">
                              {player.seasonPoints || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-200 font-mono">
                              {player.rating || 1500} ±{player.rd || 350}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Current User's Position if not in top 10 */}
                        {user && seasonTop.length > 0 && !seasonTop.some(p => String(p._id) === String(user._id)) && (
                          <tr className="bg-gradient-to-r from-blue-600/20 to-transparent border-t-2 border-blue-500/30">
                            <td colSpan="4" className="px-6 py-3 text-center text-sm text-blue-200 font-mono">
                              Your position: {seasonTop.findIndex(p => String(p._id) === String(user._id)) + 1 || 'Not ranked'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="px-6 py-3 bg-white/5 border-t border-white/5 text-center">
                    <button className="text-sm font-medium text-blue-300 hover:text-white font-mono transition-colors">
                      View Full Leaderboard →
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-center text-blue-300/60 font-mono">
                  Rankings update in real-time • Next season starts in {30 - new Date().getDate()} days
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Problem Sets */}
        <div className="grid xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3">
            <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:border-white/30 hover:shadow-2xl hover:shadow-indigo-500/20">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-400/15 to-purple-500/15 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-pink-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg glow-hover transition-all duration-300 transform hover:scale-105">
                      <span className="text-white font-bold text-2xl">🎯</span>
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white font-mono bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
                        Today's Problem Sets
                      </h2>
                      <div className="text-xs md:text-sm text-blue-300/70 font-mono mt-1 flex items-center gap-2">
                        <span>Daily.sections()</span>
                        <span className="text-purple-300">→</span>
                        <span>Solve.problems()</span>
                        <span className="text-purple-300">→</span>
                        <span className="text-pink-300 font-semibold">Points.earn()</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-200 font-mono">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                
                {loadingDaily ? (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl"></div>
                            <div className="h-6 bg-white/10 rounded w-32"></div>
                          </div>
                          <div className="h-4 bg-white/10 rounded w-12"></div>
                        </div>
                        <div className="h-4 bg-white/10 rounded w-24 mb-6"></div>
                        <div className="flex gap-3">
                          <div className="h-10 bg-white/10 rounded-xl flex-1"></div>
                          <div className="h-10 bg-white/10 rounded-xl w-24"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {today?.sections?.map((s) => (
                      <div 
                        key={s.key} 
                        className={`group relative bg-white/5 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.02] ${
                          s.unlocked 
                            ? 'border-white/20 hover:border-white/30 hover:shadow-lg hover:shadow-indigo-500/10' 
                            : 'border-white/10 cursor-not-allowed'
                        }`}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 ${
                                s.unlocked 
                                  ? 'bg-gradient-to-br from-green-500 to-emerald-500 group-hover:scale-110' 
                                  : 'bg-white/5 border border-white/10'
                              }`}>
                                <span className={`text-lg ${
                                  s.unlocked ? 'text-white' : 'text-white/40'
                                }`}>
                                  {s.unlocked ? '🔓' : '🔒'}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-bold text-white font-mono text-lg">{s.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                                    s.unlocked 
                                      ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                                      : 'bg-red-500/20 text-red-300 border border-red-400/30'
                                  }`}>
                                    {s.unlocked ? '✓ Available' : '✗ Locked'}
                                  </span>
                                  <span className="text-xs text-blue-300/70 font-mono bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                    |Q| = {s.count}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-blue-300/60 font-mono bg-white/5 px-2 py-1 rounded-lg">
                              {s.difficulty || 'Mixed'}
                            </div>
                          </div>
                          
                          <p className="text-sm text-blue-200/70 mb-6 line-clamp-2">
                            {s.description || 'Solve these problems to improve your skills and climb the leaderboard.'}
                          </p>
                          
                          <div className="flex gap-3">
                            <button 
                              className={`flex-1 px-4 py-3 rounded-xl font-mono font-medium transition-all transform hover:scale-105 ${
                                s.unlocked 
                                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-indigo-500/30" 
                                  : "bg-white/5 text-white/40 cursor-not-allowed"
                              }`} 
                              onClick={() => openSection(s.key)} 
                              disabled={!s.unlocked}
                            >
                              {s.unlocked ? 'Start Solving →' : 'Locked'}
                            </button>
                            <button 
                              className={`px-4 py-3 rounded-xl font-mono text-sm transition-all transform hover:scale-105 ${
                                s.unlocked 
                                  ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' 
                                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                              }`}
                              onClick={async () => {
                                if (!s.unlocked) return;
                                const lb = await fetchDailyLeaderboard(today.date, s.key);
                                setLeaderboard(lb.top || []);
                                setSelected(null);
                              }}
                              disabled={!s.unlocked}
                            >
                              📊
                            </button>
                          </div>
                        </div>
                        
                        {s.unlocked && (
                          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Enhanced Problem Solving Interface */}
                {selected && (
                  <div className="mt-8 pt-6 border-t border-white/20">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">📝</span>
                          </div>
                          <h3 className="text-xl font-bold text-white font-mono">Section: {selected.key}</h3>
                        </div>
                        <div className="text-sm text-blue-300 font-mono">
                          Date: {selected.date}
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        {questions.map((q, i) => (
                          <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              <div className="flex-1">
                                <div className="text-white font-mono">
                                  <span className="text-blue-300 font-bold">Q{i + 1}:</span> {q}
                                </div>
                              </div>
                              <div className="lg:w-32">
                                <input
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-mono placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
                                  value={answers[i]?.answer || ""}
                                  onChange={(e) => setAnswerAt(i, e.target.value)}
                                  placeholder="answer"
                                  type="text"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-center mb-6">
                        <button 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-mono font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                          onClick={handleSubmit}
                        >
                          Execute Submit()
                        </button>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Enhanced Daily Leaderboard */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">🏆</span>
                            </div>
                            <h4 className="font-bold text-white font-mono">Daily Rankings</h4>
                          </div>
                          <div className="space-y-2">
                            {leaderboard.length === 0 ? (
                              <div className="text-blue-300/60 font-mono text-sm text-center py-4">
                                Rankings = ∅ (empty set)
                              </div>
                            ) : (
                              leaderboard.map((r, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className="text-blue-300 font-mono text-sm">#{idx + 1}</span>
                                    <span className="text-white font-mono text-sm">{r.user.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-green-300 font-mono text-sm">{r.practicePoints} pts</div>
                                    <div className="text-blue-300/60 font-mono text-xs">{r.timeTakenSeconds}s</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        
                        {/* Enhanced Discussion */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">💬</span>
                            </div>
                            <h4 className="font-bold text-white font-mono">Discussion Forum</h4>
                          </div>
                          <Discussion 
                            date={selected.date} 
                            sectionKey={selected.key} 
                            comments={comments} 
                            onPosted={async () => {
                              const cm = await fetchComments(selected.date, selected.key);
                              setComments(cm.comments || []);
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Streak Sidebar */}
          <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/15 backdrop-blur-xl border border-white/30 p-6 rounded-3xl shadow-2xl overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-400/15 to-emerald-500/15 rounded-full blur-xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">🔥</span>
                </div>
                <h3 className="text-xl font-bold text-white font-mono">Streak Analytics</h3>
              </div>
              
              <div className="text-center mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-5xl font-bold text-green-300 font-mono mb-2">
                    {streak.currentStreak}
                  </div>
                  <div className="text-sm text-blue-200 font-mono mb-2">
                    Consecutive Days
                  </div>
                  <div className="text-xs text-blue-300/60 font-mono">
                    streak ∈ ℕ → consistency.measure()
                  </div>
                </div>
              </div>

              {/* Enhanced Day Details */}
              {pickedDay ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">📅</span>
                    </div>
                    <h4 className="font-bold text-white font-mono text-sm">Day Analysis</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-blue-200 font-mono">Date</div>
                    <div className="font-medium text-white font-mono">{pickedDay.date}</div>
                    <div className="text-sm mt-2">
                      {pickedDay.inRange ? (
                        pickedDay.solved ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 border border-green-400/30 text-green-300 font-mono">
                            ✓ Solved ∈ Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-500/20 border border-red-400/30 text-red-300 font-mono">
                            ✗ Missed ∉ Completed
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-500/20 border border-gray-400/30 text-gray-300 font-mono">
                          ∅ Out of Range
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <button 
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all font-mono text-sm" 
                      onClick={() => setPickedDay(null)}
                    >
                      Close Analysis()
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 mb-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl">📊</span>
                    </div>
                    <div className="text-sm text-blue-300/60 font-mono">
                      Calendar.click(day) → Analysis.show()
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">ℹ️</span>
                  </div>
                  <h4 className="font-bold text-white font-mono text-sm">System Info</h4>
                </div>
                <div className="text-xs text-blue-300/60 font-mono leading-relaxed">
                  Streaks.update() → Submit.daily() ∧ Points.earn() → Leaderboard.climb()
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
