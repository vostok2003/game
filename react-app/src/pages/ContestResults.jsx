import React, { useState, useEffect, useContext } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api from "../utils/api";
import { toast } from "react-toastify";

// Mathematical Symbols Animation Component
const MathSymbolsAnimation = () => {
  const [symbols, setSymbols] = useState([]);
  
  const mathSymbols = ['∑', '∫', '∆', '∞', 'π', '√', '∂', '∇', '∈', '∀', '∃', '⊂', '⊃', '∪', '∩', '≡', '≠', '≤', '≥', '±', '×', '÷', '∝', '∴', '∵', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω'];

  useEffect(() => {
    const createSymbol = () => ({
      id: Math.random(),
      left: Math.random() * 100,
      animationDuration: Math.random() * 12 + 8,
      opacity: Math.random() * 0.08 + 0.02,
      size: Math.random() * 14 + 10,
      symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
      rotation: Math.random() * 360,
    });

    const initialSymbols = Array.from({ length: 5 }, createSymbol);
    setSymbols(initialSymbols);

    const interval = setInterval(() => {
      setSymbols(prev => {
        const newSymbols = [...prev];
        if (newSymbols.length < 8) {
          newSymbols.push(createSymbol());
        }
        return newSymbols;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
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

export default function ContestResults() {
  const { contestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [contest, setContest] = useState(null);
  const [userAttempt, setUserAttempt] = useState(location.state?.attempt || null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (!user) {
      toast.error("Please login to view contest results");
      navigate("/login");
      return;
    }
    
    loadContestResults();
  }, [contestId, user]);

  const loadContestResults = async () => {
    try {
      setLoading(true);

      // Load contest details
      const contestRes = await api.get("/contest/next");
      const contestData = contestRes.data?.contest;
      if (contestData && contestData._id === contestId) {
        setContest(contestData);
      }

      // Load user's attempt if not provided
      if (!userAttempt) {
        const historyRes = await api.get("/contest/history", { params: { limit: 10 } });
        const attempts = historyRes.data?.attempts || [];
        const currentAttempt = attempts.find(a => a.contestId._id === contestId);
        if (currentAttempt) {
          setUserAttempt(currentAttempt);
        }
      }

      // Load leaderboard
      const leaderboardRes = await api.get("/contest/leaderboard", { 
        params: { contestId, limit: 50 } 
      });
      setLeaderboard(leaderboardRes.data?.leaderboard || []);

      // Load contest stats
      const statsRes = await api.get("/contest/stats", { 
        params: { contestId } 
      });
      setStats(statsRes.data?.stats || null);

    } catch (error) {
      console.error("Error loading contest results:", error);
      toast.error("Failed to load contest results");
    } finally {
      setLoading(false);
    }
  };

  const getBadgeInfo = (badge) => {
    const badges = {
      'contest-winner': { name: '🏆 Winner', color: 'bg-yellow-100 text-yellow-800' },
      'contest-top-3': { name: '🥉 Top 3', color: 'bg-orange-100 text-orange-800' },
      'contest-top-10': { name: '🏅 Top 10', color: 'bg-blue-100 text-blue-800' },
      'contest-top-performer': { name: '⭐ Top Performer', color: 'bg-purple-100 text-purple-800' },
      'contest-master': { name: '🎯 Master', color: 'bg-red-100 text-red-800' },
      'contest-expert': { name: '🔥 Expert', color: 'bg-green-100 text-green-800' },
      'contest-advanced': { name: '📈 Advanced', color: 'bg-indigo-100 text-indigo-800' },
      'contest-intermediate': { name: '📊 Intermediate', color: 'bg-teal-100 text-teal-800' },
      'contest-participant': { name: '🎪 Participant', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[badge] || { name: badge, color: 'bg-gray-100 text-gray-800' };
  };

  const getPerformanceMessage = () => {
    if (!userAttempt) return "";
    
    const { correctCount, totalScore, rank, percentile } = userAttempt;
    
    if (rank === 1) return "🏆 Congratulations! You won the contest!";
    if (rank <= 3) return "🥉 Amazing! You're in the top 3!";
    if (rank <= 10) return "🏅 Great job! You're in the top 10!";
    if (percentile >= 90) return "⭐ Excellent performance! Top 10% of participants!";
    if (percentile >= 75) return "🎯 Well done! You're in the top 25%!";
    if (percentile >= 50) return "📈 Good job! Above average performance!";
    if (correctCount >= 10) return "👍 Nice work! You got more than half correct!";
    if (correctCount > 0) return "🎪 Thanks for participating! Keep practicing!";
    return "💪 Don't give up! Every attempt is a learning opportunity!";
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-gray-900">
        <MathSymbolsAnimation />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-white font-mono text-lg mb-2">Computing Results...</div>
            <div className="text-blue-300 font-mono text-sm">∑ analysis = processing...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!userAttempt) {
    return (
      <div className="min-h-screen relative bg-gray-900">
        <MathSymbolsAnimation />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-400 text-xl font-mono mb-4">Attempt ∉ Database</div>
            <div className="text-blue-300 font-mono text-sm mb-6">Error: userAttempt = ∅ (empty set)</div>
            <button
              onClick={() => navigate("/")}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-mono"
            >
              Return Home()
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate performance metrics
  const performanceMetrics = [
    { 
      id: 'score',
      value: userAttempt.totalScore,
      label: 'Total Score',
      symbol: 'Σ',
      color: 'bg-blue-600',
      description: 'Sum of all points earned',
      domain: `∈ [0, 100]`
    },
    { 
      id: 'correct',
      value: userAttempt.correctCount,
      label: 'Correct',
      symbol: '✓',
      color: 'from-green-500 to-emerald-500',
      description: 'Number of correct answers',
      domain: `∈ [0, 20]`
    },
    { 
      id: 'rank',
      value: `#${userAttempt.rank || 'N/A'}`,
      label: 'Rank',
      symbol: '🏆',
      color: 'from-yellow-500 to-amber-500',
      description: 'Your position',
      domain: '∈ ℕ'
    },
    { 
      id: 'percentile',
      value: `${userAttempt.percentile || 0}%`,
      label: 'Percentile',
      symbol: '%',
      color: 'from-purple-500 to-pink-500',
      description: 'Better than X% of participants',
      domain: '∈ [0, 100]'
    }
  ];

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="min-h-screen relative bg-gray-900 overflow-hidden">
      <MathSymbolsAnimation />
      <div className="absolute inset-0 bg-gray-900"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="relative overflow-hidden bg-gray-800 rounded-2xl shadow-2xl mb-8 border border-gray-700">
          {/* Decorative Elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">Σ</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white font-sans tracking-tight">
                      Contest Results
                    </h1>
                    <p className="text-blue-100 font-mono text-sm mt-1">
                      {contest?.title || 'Weekly Math Contest'}
                    </p>
                  </div>
                </div>
                
                {/* Performance Message */}
                <div className="text-lg text-blue-100 font-medium max-w-2xl">
                  {getPerformanceMessage()}
                </div>
              </div>
              
              <button
                onClick={() => navigate("/")}
                className="group relative overflow-hidden bg-blue-600 border border-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 font-medium flex items-center gap-2 self-start md:self-auto"
              >
                <span className="relative z-10">Return Home</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </div>
            
            {/* Performance Metrics Grid */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {performanceMetrics.map((metric) => (
                <div 
                  key={metric.id}
                  className={`bg-gray-700 border border-gray-600 rounded-xl p-5 relative overflow-hidden group`}
                >
                  <div className="absolute top-3 right-3 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">
                    {metric.symbol}
                  </div>
                  <div className="relative z-10">
                    <div className="text-3xl font-bold text-white mb-1">
                      {metric.value}
                    </div>
                    <div className="text-sm text-blue-100 font-medium">
                      {metric.label}
                    </div>
                    <div className="text-xs text-blue-200/70 mt-1 font-mono">
                      {metric.domain}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Badges Section */}
            {userAttempt.badges?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-medium text-blue-100 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Badges Earned
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userAttempt.badges.map((badge, index) => {
                    const badgeInfo = getBadgeInfo(badge);
                    return (
                      <span
                        key={index}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm border ${
                          badgeInfo.color.includes('yellow') ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' :
                          badgeInfo.color.includes('orange') ? 'bg-orange-500/10 text-orange-300 border-orange-500/20' :
                          badgeInfo.color.includes('red') ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                          badgeInfo.color.includes('green') ? 'bg-green-500/10 text-green-300 border-green-500/20' :
                          badgeInfo.color.includes('blue') ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                          badgeInfo.color.includes('purple') ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                          'bg-white/5 text-white/80 border-white/10'
                        }`}
                      >
                        {badgeInfo.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="h-1 bg-white/5">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 transition-all duration-1000 ease-out"
              style={{ width: `${(userAttempt.correctCount / 20) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl mb-8 overflow-hidden">
          <div className="border-b border-white/5">
            <nav className="flex overflow-x-auto no-scrollbar">
              <div className="flex">
                {[
                  { id: 'summary', label: 'Summary', icon: '📊' },
                  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
                  { id: 'answers', label: 'Answers', icon: '✏️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 text-sm font-medium relative group ${
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-white/60 hover:text-white/90'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </span>
                    <span 
                      className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${
                        activeTab === tab.id 
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-400' 
                          : 'bg-transparent group-hover:bg-white/20'
                      }`}
                    ></span>
                  </button>
                ))}
              </div>
            </nav>
          </div>

          <div className="p-6">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Performance Card */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm border border-blue-400/20 p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-lg text-white">Performance</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-200">Attempted</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            {userAttempt.answers?.length || 0}/20
                          </span>
                          <div className="w-20 h-1.5 bg-blue-900/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400 rounded-full"
                              style={{ width: `${(userAttempt.answers?.length / 20) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-500/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-green-300">{userAttempt.correctCount}</div>
                          <div className="text-xs text-blue-200 mt-1">Correct</div>
                        </div>
                        <div className="bg-blue-500/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-red-300">{userAttempt.wrongCount}</div>
                          <div className="text-xs text-blue-200 mt-1">Incorrect</div>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-blue-200">Accuracy</span>
                          <span className="font-medium text-yellow-300">
                            {userAttempt.answers?.length > 0 
                              ? Math.round((userAttempt.correctCount / userAttempt.answers.length) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-blue-900/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-400 to-cyan-400 rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${(userAttempt.correctCount / (userAttempt.answers?.length || 1)) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contest Stats Card */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-sm border border-purple-400/20 p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-lg text-white">Contest Stats</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-purple-500/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-purple-200">{stats?.totalRegistered || 0}</div>
                          <div className="text-xs text-purple-300/80 mt-1">Participants</div>
                        </div>
                        <div className="bg-purple-500/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-purple-200">{stats?.completedAttempts || 0}</div>
                          <div className="text-xs text-purple-300/80 mt-1">Completed</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-200">Avg. Score</span>
                          <span className="font-medium text-white">{Math.round(stats?.averageScore || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-200">Completion Rate</span>
                          <span className="font-medium text-white">{Math.round(stats?.completionRate || 0)}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-200">Your Rank</span>
                          <span className="font-bold text-yellow-300">#{userAttempt.rank || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-purple-200">Percentile</span>
                          <span className="font-medium text-yellow-300">{userAttempt.percentile || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-purple-900/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                            style={{ width: `${userAttempt.percentile || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Analysis Card */}
                  <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-400/20 p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-lg text-white">Time Analysis</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-cyan-500/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-cyan-200">
                            {Math.floor((userAttempt.totalTimeSpent || 0) / 60)}m
                          </div>
                          <div className="text-xs text-cyan-300/80 mt-1">Total Time</div>
                        </div>
                        <div className="bg-cyan-500/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-cyan-200">
                            {userAttempt.answers?.length > 0 
                              ? Math.round((userAttempt.totalTimeSpent || 0) / userAttempt.answers.length)
                              : 0}s
                          </div>
                          <div className="text-xs text-cyan-300/80 mt-1">Avg / Question</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-200">Started</span>
                          <span className="text-cyan-100 font-medium">
                            {new Date(userAttempt.startedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-200">Submitted</span>
                          <span className="text-cyan-100 font-medium">
                            {userAttempt.submittedAt 
                              ? new Date(userAttempt.submittedAt).toLocaleTimeString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-cyan-200">Pace</span>
                          <span className="font-medium text-cyan-100">
                            {userAttempt.answers?.length > 0 ? 
                              Math.round((userAttempt.answers.length / (userAttempt.totalTimeSpent || 1)) * 60) : 0}
                            q/h
                          </span>
                        </div>
                        <div className="w-full h-2 bg-cyan-900/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (userAttempt.answers?.length || 0) * 5)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional Insights */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-white/5 p-5 rounded-xl">
                  <h3 className="font-bold text-lg text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Performance Insights
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <div className="text-sm text-blue-200 mb-1">Strengths</div>
                      <div className="text-xs text-blue-300/80">
                        {userAttempt.correctCount > 0 ? 
                          `You answered ${userAttempt.correctCount} questions correctly. ` :
                          'Keep practicing to identify your strengths.'
                        }
                        {userAttempt.correctCount >= 15 ? ' Excellent work!' : ''}
                      </div>
                    </div>
                    <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                      <div className="text-sm text-purple-200 mb-1">Areas to Improve</div>
                      <div className="text-xs text-purple-300/80">
                        {userAttempt.wrongCount > 0 ? 
                          `Review ${userAttempt.wrongCount} incorrect answers to improve.` :
                          'Great job! No incorrect answers to review.'
                        }
                      </div>
                    </div>
                    <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                      <div className="text-sm text-cyan-200 mb-1">Next Steps</div>
                      <div className="text-xs text-cyan-300/80">
                        {userAttempt.rank <= 10 ? 
                          'You\'re in the top 10! Try to maintain your position.' :
                          'Keep practicing to climb the leaderboard!'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Contest Leaderboard</h3>
                    <p className="text-sm text-blue-200 mt-1">
                      Showing top {leaderboard.length} participants • Your rank: 
                      <span className="font-bold text-yellow-300 ml-1">
                        #{userAttempt.rank || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search participants..."
                        className="w-full bg-white/5 border border-white/10 text-white placeholder-blue-300/50 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg className="w-4 h-4 text-blue-300 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                      <thead className="bg-white/5">
                        <tr>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                            Rank
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                            Participant
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-blue-200 uppercase tracking-wider text-right">
                            Score
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-blue-200 uppercase tracking-wider text-center">
                            Correct
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-blue-200 uppercase tracking-wider text-right">
                            Time
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                            Badges
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {leaderboard.map((entry, index) => {
                          const isCurrentUser = entry.userId?._id === user._id;
                          const top3 = index < 3;
                          let rankClass = '';
                          
                          if (index === 0) rankClass = 'bg-gradient-to-r from-yellow-500/5 to-yellow-500/10 border-l-4 border-yellow-400';
                          else if (index === 1) rankClass = 'bg-gradient-to-r from-gray-400/5 to-gray-400/10 border-l-4 border-gray-300';
                          else if (index === 2) rankClass = 'bg-gradient-to-r from-amber-600/5 to-amber-600/10 border-l-4 border-amber-500';
                          
                          return (
                            <tr 
                              key={entry._id}
                              className={`transition-colors ${isCurrentUser ? 'bg-blue-500/5' : 'hover:bg-white/5'} ${rankClass}`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                    index === 0 ? 'bg-yellow-500/20 text-yellow-300' :
                                    index === 1 ? 'bg-gray-400/20 text-gray-300' :
                                    index === 2 ? 'bg-amber-600/20 text-amber-300' :
                                    'bg-white/5 text-white/60'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`flex-shrink-0 h-8 w-8 rounded-full ${isCurrentUser ? 'bg-blue-500/20' : 'bg-white/5'} flex items-center justify-center text-sm font-medium ${isCurrentUser ? 'text-blue-300' : 'text-white/70'}`}>
                                    {entry.userId?.name?.charAt(0) || 'A'}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-white">
                                      {entry.userId?.name || 'Anonymous'}
                                      {isCurrentUser && (
                                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-blue-300/70">
                                      {entry.userId?.email ? entry.userId.email.replace(/@.*$/, '') : 'anonymous'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-white">
                                  {entry.totalScore}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {entry.correctCount}
                                  </span>
                                  <span className="mx-1 text-white/50">/</span>
                                  <span className="text-xs text-white/50">20</span>
                                  <div className="ml-2 w-16 bg-white/10 rounded-full h-1.5">
                                    <div 
                                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-cyan-400"
                                      style={{ width: `${(entry.correctCount / 20) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-sm text-white/80 font-mono">
                                  {Math.floor((entry.totalTimeSpent || 0) / 60)}:{
                                    String((entry.totalTimeSpent || 0) % 60).padStart(2, '0')
                                  }
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                  {entry.badges?.slice(0, 2).map((badge, badgeIndex) => {
                                    const badgeInfo = getBadgeInfo(badge);
                                    return (
                                      <span
                                        key={badgeIndex}
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          badgeInfo.color.includes('yellow') ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' :
                                          badgeInfo.color.includes('orange') ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20' :
                                          badgeInfo.color.includes('red') ? 'bg-red-500/10 text-red-300 border border-red-500/20' :
                                          badgeInfo.color.includes('green') ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
                                          badgeInfo.color.includes('blue') ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
                                          badgeInfo.color.includes('purple') ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' :
                                          'bg-white/5 text-white/80 border border-white/10'
                                        }`}
                                        title={badgeInfo.name}
                                      >
                                        {badgeInfo.name.split(' ')[0]}
                                      </span>
                                    );
                                  })}
                                  {entry.badges?.length > 2 && (
                                    <span 
                                      className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/50 border border-white/10"
                                      title={`${entry.badges.length - 2} more badges`}
                                    >
                                      +{entry.badges.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="px-6 py-3 flex items-center justify-between border-t border-white/5 bg-white/2.5">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button className="relative inline-flex items-center px-4 py-2 border border-white/10 text-sm font-medium rounded-md text-white bg-white/5 hover:bg-white/10">
                        Previous
                      </button>
                      <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-white/10 text-sm font-medium rounded-md text-white bg-white/5 hover:bg-white/10">
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-blue-200">
                          Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{' '}
                          <span className="font-medium">{leaderboard.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10">
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button className="bg-blue-500/10 border-blue-400/30 text-blue-300 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                            1
                          </button>
                          <button className="border-white/10 text-white/60 hover:bg-white/5 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                            2
                          </button>
                          <button className="border-white/10 text-white/60 hover:bg-white/5 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                            3
                          </button>
                          <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10">
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-400/50 mr-1.5"></div>
                    <span className="text-yellow-300">1st Place</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400/20 border border-gray-300/50 mr-1.5"></div>
                    <span className="text-gray-300">2nd Place</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-600/20 border border-amber-500/50 mr-1.5"></div>
                    <span className="text-amber-300">3rd Place</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-400/50 mr-1.5"></div>
                    <span className="text-blue-300">You</span>
                  </div>
                </div>
              </div>
            )}

            {/* Answers Review Tab */}
            {activeTab === 'answers' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Your Answers Review</h3>
                    <p className="text-sm text-blue-200 mt-1">
                      Review your responses and learn from any mistakes
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-400 mr-2"></div>
                      <span className="text-xs text-green-300">Correct: {userAttempt.correctCount}</span>
                    </div>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-400 mr-2"></div>
                      <span className="text-xs text-red-300">Incorrect: {userAttempt.wrongCount}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {userAttempt.answers?.length > 0 ? (
                    userAttempt.answers.map((answer, index) => {
                      const isCorrect = answer.isCorrect;
                      const question = questions?.[answer.questionIndex];
                      
                      return (
                        <div 
                          key={index}
                          className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                            isCorrect 
                              ? 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10' 
                              : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
                          }`}
                        >
                          {/* Decorative corner */}
                          <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 ${
                            isCorrect ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              {isCorrect ? (
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                              ) : (
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                              )}
                            </svg>
                          </div>
                          
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-blue-200 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                                    Q{answer.questionIndex + 1}
                                  </span>
                                  <span className="text-xs text-white/50">
                                    {answer.points} point{answer.points !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                
                                <div className="mt-2 text-white font-medium">
                                  {question?.question || 'Question not available'}
                                </div>
                                
                                <div className="mt-2 text-xs text-blue-300/70 flex items-center gap-3">
                                  <span className="flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {answer.timeSpent}s
                                  </span>
                                  {question?.difficulty && (
                                    <span className="flex items-center">
                                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isCorrect 
                                  ? 'bg-green-500/20 text-green-300' 
                                  : 'bg-red-500/20 text-red-300'
                              }`}>
                                {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <div className="text-xs font-medium text-blue-200 mb-1 flex items-center">
                                  <span className={`w-2 h-2 rounded-full mr-2 ${
                                    isCorrect ? 'bg-green-400' : 'bg-red-400'
                                  }`}></span>
                                  Your Answer
                                </div>
                                <div className={`p-3 rounded-lg ${
                                  isCorrect 
                                    ? 'bg-green-500/10 border border-green-500/20' 
                                    : 'bg-red-500/10 border border-red-500/20'
                                }`}>
                                  <div className="font-mono text-lg">
                                    {answer.userAnswer}
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-xs font-medium text-blue-200 mb-1 flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                                  {isCorrect ? 'Correct Answer' : 'Expected Answer'}
                                </div>
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                  <div className="font-mono text-lg">
                                    {answer.correctAnswer}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {!isCorrect && answer.explanation && (
                              <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <div className="text-xs font-medium text-blue-200 mb-1">
                                  Explanation
                                </div>
                                <div className="text-sm text-blue-100/80">
                                  {answer.explanation}
                                </div>
                              </div>
                            )}
                            
                            {question?.topics?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {question.topics.map((topic, i) => (
                                  <span 
                                    key={i}
                                    className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-200 border border-blue-500/20"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Bottom border accent */}
                          <div className={`h-1 w-full ${
                            isCorrect ? 'bg-green-500/30' : 'bg-red-500/30'
                          }`}></div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-blue-300 mb-2">
                        <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-white">No answers recorded</h4>
                      <p className="text-blue-300 mt-1">Your answers will appear here after submission</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx global>{`
          @keyframes float {
            0% {
              transform: translateY(100vh) rotate(0deg);
            }
            100% {
              transform: translateY(-100px) rotate(360deg);
            }
          }
          
          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }
          
          .animate-blob {
            animation: blob 7s infinite;
          }
          
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          
          .animation-delay-4000 {
            animation-delay: 4s;
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          
          /* Hide scrollbar but keep functionality */
          .no-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          .no-scrollbar::-webkit-scrollbar {
            display: none;  /* Chrome, Safari, Opera */
          }
        `}</style>
      </div>
    </div>
  );
}
