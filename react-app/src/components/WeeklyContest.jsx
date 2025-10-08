import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import ContestProgress from "./ContestProgress";

export default function WeeklyContest() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    loadContestData();
  }, []);

  useEffect(() => {
    if (!contest) return;
    
    // Update immediately
    updateTimeLeft();
    
    // Set up interval for continuous updates
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  const loadContestData = async () => {
    setLoading(true);
    try {
      // Load next contest
      const contestRes = await api.get("/contest/next");
      const contestData = contestRes.data?.contest;
      setContest(contestData);

      if (contestData && user) {
        // Check if user is registered
        const isReg = contestData.registeredUsers?.some(
          (regUser) => String(regUser._id || regUser) === String(user._id)
        );
        setRegistered(isReg);

        // Load leaderboard
        await loadLeaderboard(contestData._id);
        
        // Load contest stats
        await loadStats(contestData._id);
      }
    } catch (error) {
      console.error("Error loading contest data:", error);
      toast.error("Failed to load contest data");
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (contestId) => {
    try {
      const res = await api.get("/contest/leaderboard", { 
        params: { contestId, limit: 5 } 
      });
      setLeaderboard(res.data?.leaderboard || []);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  };

  const loadStats = async (contestId) => {
    try {
      const res = await api.get("/contest/stats", { 
        params: { contestId } 
      });
      setStats(res.data?.stats || null);
    } catch (error) {
      console.error("Error loading contest stats:", error);
    }
  };

  const updateTimeLeft = () => {
    if (!contest) return;

    const now = new Date();
    const openTime = new Date(contest.openTime);
    const closeTime = new Date(contest.closeTime);

    if (now < openTime) {
      // Contest hasn't started
      const diff = openTime - now;
      setTimeLeft(formatTimeLeft(diff));
    } else if (now >= openTime && now <= closeTime) {
      // Contest is live
      const diff = closeTime - now;
      setTimeLeft(`Ends in ${formatTimeLeft(diff)}`);
    } else {
      // Contest has ended
      setTimeLeft("Contest ended");
    }
  };

  const formatTimeLeft = (ms) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleRegister = async () => {
    if (!user) {
      toast.error("Please login to register for the contest");
      return;
    }

    try {
      await api.post("/contest/register", { contestId: contest._id });
      toast.success("Successfully registered for the contest!");
      setRegistered(true);
      await loadContestData(); // Refresh data
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error?.response?.data?.error || "Registration failed");
    }
  };

  const handleJoinContest = () => {
    if (!user) {
      toast.error("Please login to join the contest");
      return;
    }

    if (!registered) {
      toast.error("Please register for the contest first");
      return;
    }

    navigate(`/contest/${contest._id}`);
  };

  const getContestStatus = () => {
    if (!contest) return { text: "No contest scheduled", color: "text-gray-500" };

    const now = new Date();
    const openTime = new Date(contest.openTime);
    const closeTime = new Date(contest.closeTime);

    if (now < openTime) {
      return { text: "Upcoming", color: "text-blue-600" };
    } else if (now >= openTime && now <= closeTime) {
      return { text: "Live Now!", color: "text-green-600 animate-pulse" };
    } else {
      return { text: "Completed", color: "text-gray-500" };
    }
  };

  const isLive = contest && new Date() >= new Date(contest.openTime) && new Date() <= new Date(contest.closeTime);
  const isUpcoming = contest && new Date() < new Date(contest.openTime);
  const isCompleted = contest && new Date() > new Date(contest.closeTime);
  const status = getContestStatus();

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl shadow-2xl mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-white/20 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/15 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl mb-8 overflow-hidden">
      {/* Enhanced Decorative Elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-yellow-400/15 to-orange-500/15 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-green-400/15 to-emerald-500/15 rounded-full blur-2xl"></div>
      <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-r from-purple-400/10 to-pink-500/10 rounded-full blur-xl"></div>
      
      {/* Contest Header - Hero Style */}
      <div className="relative z-10 mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">∫</span>
                </div>
                {isLive && (
                  <>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping"></div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </>
                )}
                {isUpcoming && (
                  <>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white font-mono leading-tight">
                  Weekly Math Contest
                  {isLive && <span className="text-red-400 ml-2">● LIVE</span>}
                  {isUpcoming && <span className="text-blue-400 ml-2">● UPCOMING</span>}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <p className="text-blue-200 font-mono text-sm">
                    ∀ Friday ∈ Week → Contest(15:30) ∧ Duration(10min) ∧ |Questions| = 20
                  </p>
                  <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-400/30 rounded-full">
                    <span className="text-yellow-300 text-xs font-mono">COMPETITIVE</span>
                  </div>
                </div>
                <div className="text-xs text-blue-300/60 font-mono mt-2">
                  Earn badges ∈ Achievements → Compete() ∀ users globally
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-blue-300/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Real-time Scoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Global Leaderboard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Badge System</span>
              </div>
            </div>
          </div>
          
          {/* Enhanced Status Card */}
          <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/30 min-w-[200px]">
            <div className="text-center">
              <div className="text-sm text-blue-200 font-mono mb-2">Contest Status</div>
              <div className={`text-2xl font-bold font-mono mb-3 ${
                status.color === 'text-blue-600' ? 'text-blue-300' : 
                status.color === 'text-green-600' ? 'text-green-300' : 
                status.color === 'text-gray-500' ? 'text-gray-300' : 
                status.color
              }`}>
                {status.text}
              </div>
              {timeLeft && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="text-lg font-bold text-white font-mono">
                    {timeLeft}
                  </div>
                  <div className="text-xs text-blue-300/60 font-mono mt-1">
                    Time Remaining
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!contest ? (
        <div className="relative z-10 text-center py-12">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📅</span>
          </div>
          <div className="text-blue-200 font-mono text-lg mb-2">Contest = ∅ (empty set)</div>
          <div className="text-sm text-blue-300/60 font-mono">
            ∀ Friday ∈ Calendar → Contest(15:30) | Check schedule.next()
          </div>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Enhanced Contest Info & Actions */}
          <div className="xl:col-span-3">
            {/* Contest Details Card */}
            <div className="bg-gradient-to-r from-blue-500/25 to-purple-500/20 backdrop-blur-sm border border-white/30 p-6 rounded-2xl mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-400/20 to-purple-500/20 rounded-full blur-xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📊</span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono">{contest.title}</h3>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-xs text-blue-200 font-mono mb-2">Start Time</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {new Date(contest.openTime).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-xs text-blue-200 font-mono mb-2">Duration</div>
                    <div className="text-sm font-bold text-white font-mono">10 minutes ∈ ℕ</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-xs text-blue-200 font-mono mb-2">Questions</div>
                    <div className="text-sm font-bold text-white font-mono">|Q| = 20 problems</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-xs text-blue-200 font-mono mb-2">Registered</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {stats?.totalRegistered || contest.registeredUsers?.length || 0} ∈ Users
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Action Buttons Section */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">⚡</span>
                </div>
                <h4 className="text-lg font-bold text-white font-mono">Contest Actions</h4>
              </div>
              
              <div className="space-y-4">
                {isUpcoming && !registered && (
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                      onClick={handleRegister}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all font-mono font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      Execute Register()
                    </button>
                    <div className="text-sm text-blue-200 font-mono">
                      Join the competition and test your skills
                    </div>
                  </div>
                )}

                {isUpcoming && registered && (
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="bg-gradient-to-r from-green-500/30 to-emerald-500/20 backdrop-blur-sm border border-green-400/40 text-green-300 px-6 py-4 rounded-2xl font-mono font-medium">
                      ✓ Registered ∈ Users
                    </div>
                    <div className="text-sm text-blue-200 font-mono">
You're all set for the competition
                    </div>
                  </div>
                )}

                {isLive && registered && (
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                      onClick={handleJoinContest}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all font-mono font-medium animate-pulse shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      🚀 Join Contest() → Live!
                    </button>
                    <div className="text-sm text-green-200 font-mono">
                      Contest is active → Click to participate now!
                    </div>
                  </div>
                )}

                {isLive && !registered && (
                  <div className="bg-gradient-to-r from-yellow-500/30 to-orange-500/20 backdrop-blur-sm border border-yellow-400/40 text-yellow-300 px-6 py-4 rounded-2xl font-mono">
                    ⚠️ Contest.live = true ∧ user.registered = false
                  </div>
                )}

                {isCompleted && (
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                      onClick={() => navigate(`/contest/${contest._id}/results`)}
                      className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-2xl hover:bg-white/20 transition-all font-mono font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📊 View Results()
                    </button>
                    <div className="text-sm text-blue-200 font-mono">
                      Contest completed → Analyze your performance
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Progress Analytics Button */}
            {user && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl mb-6">
                <button
                  onClick={() => setShowProgress(!showProgress)}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 hover:from-purple-500/30 hover:to-pink-500/30 text-white px-6 py-4 rounded-xl transition-all font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📊</span>
                    <span className="font-medium">Analytics.view() → Personal Insights</span>
                  </div>
                  <span className={`transform transition-transform text-xl ${showProgress ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>
            )}

            {/* Enhanced Contest Rules */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">📋</span>
                </div>
                <h4 className="text-lg font-bold text-white font-mono">Contest Algorithm</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 text-sm text-blue-200 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    <span>∀ question ∈ Q[1..20] → solve(question)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Difficulty: f(i) = progressive(easy → hard)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">•</span>
                    <span>Submit(answers) → Score.calculate()</span>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-blue-200 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>Leaderboard.update() → real_time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-pink-400">•</span>
                    <span>Performance → Badges ∈ Achievements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    <span>Global competition ∀ users</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Collapsible Progress Section */}
            {showProgress && (
              <div className="mt-6 animate-fadeInUp">
                <ContestProgress user={user} />
              </div>
            )}
          </div>

          {/* Enhanced Mathematical Leaderboard */}
          <div className="bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-xl border border-white/30 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-yellow-400/15 to-orange-500/15 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">🏆</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white font-mono">Top Performers</h4>
                  <div className="text-xs text-blue-300/60 font-mono mt-1">
                    Live Rankings → Real-time Updates
                  </div>
                </div>
              </div>
              
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div className="text-blue-300/60 font-mono text-sm mb-2">
                    Leaderboard = ∅ (empty set)
                  </div>
                  <div className="text-blue-300/40 font-mono text-xs">
                    Participate → Join Rankings
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry._id}
                      className={`group relative p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/15 border-yellow-400/40' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/15 border-gray-400/40' :
                        index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-red-500/15 border-orange-400/40' :
                        'bg-white/10 border-white/20'
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                            index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-500 text-white' :
                            'bg-blue-500/30 text-blue-300'
                          }`}>
                            {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                          </div>
                          <div>
                            <div className="text-white font-mono font-medium">
                              {entry.userId?.name || 'Anonymous'}
                            </div>
                            <div className="text-xs text-blue-300/60 font-mono">
                              Rank[{index + 1}] ∈ Leaderboard
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold font-mono ${
                            index === 0 ? 'text-yellow-300' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-orange-300' :
                            'text-blue-300'
                          }`}>
                            {entry.totalScore}
                          </div>
                          <div className="text-xs text-blue-300/60 font-mono">
                            points
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {stats && (
                <div className="mt-6 pt-4 border-t border-white/20">
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                      <div className="text-blue-200 mb-1">Average Score</div>
                      <div className="text-white font-bold">μ = {Math.round(stats.averageScore || 0)}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                      <div className="text-blue-200 mb-1">Completion</div>
                      <div className="text-white font-bold">{Math.round(stats.completionRate || 0)}%</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 text-xs text-blue-300/60 font-mono text-center">
                |Participants| = {leaderboard.length} users
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
