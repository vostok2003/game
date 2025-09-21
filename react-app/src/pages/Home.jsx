// src/pages/Home.jsx
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import getSocket from "../socket";
const socket = getSocket();
import { UserContext } from "../context/UserContext";
import { fetchToday, fetchSectionProblems, fetchDailyLeaderboard, fetchStreak } from "../services/dailyService";

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
        const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const url = `${baseURL}/leaderboard`;
        console.log("[Leaderboard] fetching", url);
        const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });

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
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-6">
      <div className="w-full max-w-5xl">
        <div className="bg-white p-6 rounded-lg shadow mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-blue-700">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
            <p className="text-sm text-gray-600 mt-1">Play fast math matches and climb the leaderboard!</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Your rating</div>
            <div className="text-2xl font-semibold text-gray-800">
              {user?.rating ?? 1500} <span className="text-gray-400 text-sm">±{user?.rd ?? 350}</span>
            </div>
          </div>
        </div>
        {/* --- Daily Practice Panel (paste directly under header div) --- */}
<div className="bg-white p-6 rounded-lg shadow mb-6">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-2xl font-bold text-blue-700">Daily Practice</h2>
      <p className="text-sm text-gray-600 mt-1">
        New problems unlock daily. Same set for everyone — build streaks and earn Practice Points.
      </p>
    </div>
    <div className="text-right">
      <div className="text-xs text-gray-500">Today</div>
      <div className="text-lg font-semibold text-gray-800">
        {new Date().toLocaleDateString()}
      </div>
    </div>
  </div>

  {loadingDaily ? (
    <div className="mt-4 text-center py-8">
      <div className="text-gray-600">Loading daily practice...</div>
    </div>
  ) : (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 daily-practice-card">
      <div className="md:col-span-2">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Available Sections</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {dailySections.map(section => (
                <button 
                  key={section.key}
                  onClick={() => handleSectionSelect(section)}
                  className={`text-left px-3 py-2 ${selectedSection?.key === section.key ? 'bg-blue-50' : 'bg-white'} border rounded hover:bg-blue-100 ${!section.unlocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!section.unlocked}
                >
                  {section.title} 
                  <div className="text-xs text-gray-500">
                    {section.key === 'basic' ? 'Open to all' : 
                     section.key === 'intermediate' ? '1600+' : 
                     section.key === 'advanced' ? '1800+' : '1900+'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="w-40">
            <div className="text-sm text-gray-500">Your streak</div>
            <div className="text-2xl font-semibold text-green-600">{streak.currentStreak || 0}</div>
            <div className="text-xs text-gray-400 mt-1">days</div>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Today's quick sample</div>
            <div className="text-xs text-gray-500">
              {selectedSection ? `${sampleProblems.length} problems · ${selectedSection.title}` : 'Select a section'}
            </div>
          </div>

          {sampleProblems.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {sampleProblems.map((problem, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                  <div>{problem}</div>
                  <div className="text-sm text-gray-500">Answer: —</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 p-4 text-center text-gray-500 bg-gray-50 rounded border">
              {selectedSection && !selectedSection.unlocked 
                ? 'This section is locked. Improve your rating to unlock.'
                : selectedSection 
                  ? 'No problems available for this section.'
                  : 'Select a section to see sample problems.'}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button 
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              onClick={handleOpenDaily}
            >
              Open Daily
            </button>
            <button 
              className="bg-white border px-4 py-2 rounded hover:bg-gray-50"
              onClick={() => navigate('/daily')}
            >
              View Leaderboard
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded p-4 shadow-sm">
        <div className="text-sm text-gray-600">Daily Top</div>
        {dailyLeaderboard.length > 0 ? (
          <ol className="mt-3 list-decimal pl-5 space-y-2">
            {dailyLeaderboard.map((entry, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium">{entry.user.name}</span> — 
                <span className="text-gray-600">{entry.practicePoints} pts</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-3 text-center text-gray-500 py-4">
            No entries yet for this section
          </div>
        )}
        <div className="mt-4 text-xs text-gray-400">Updated daily</div>
      </div>
    </div>
  )}
</div>
{/* --- end Daily Practice Panel --- */}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Play</h2>
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Create a multiplayer room and invite a friend, or join an existing room with a code. You can also play single-player timed mode.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-1">
                  <label className="block text-gray-700 mb-1">Game Mode</label>
                  <select className="w-full px-3 py-2 border rounded" value={mode} onChange={(e) => setMode(Number(e.target.value))}>
                    {gameModes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-gray-700 mb-1">Room Code</label>
                  <input type="text" className="w-full px-3 py-2 border rounded" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Enter room code to join or leave blank to create" />
                </div>

                <div className="md:col-span-1 flex gap-2">
                  <button className="flex-1 bg-blue-600 text-white py-2 rounded" onClick={handleCreate}>Create Room</button>
                  <button className="flex-1 bg-green-600 text-white py-2 rounded" onClick={room ? handleJoin : () => alert('Please enter a room code')}>Join Room</button>
                </div>
              </div>
            </div>

            <div className="border-t pt-5">
              <h3 className="text-lg font-semibold mb-3">Single Player</h3>
              <p className="text-gray-600 mb-3">Practice alone against the clock. Your score won't affect the multiplayer leaderboard but will show up in results.</p>
              <div className="flex gap-3">
                <button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={handleSinglePlayer}>Play Against Time</button>
                <div className="flex items-center text-sm text-gray-500">(Choose mode above)</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
            {loadingLeaderboard ? (
              <div className="text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                <table className="w-full text-left">
                  <thead className="text-sm text-gray-600">
                    <tr><th className="py-2">#</th><th className="py-2">Player</th><th className="py-2">Rating</th></tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-gray-500">No players yet</td></tr>
                    )}
                    {leaderboard.map((p, i) => (
                      <tr key={p._id || p.name || i} className={`border-t ${user && (String(user._id) === String(p._id) || user.name === p.name) ? "bg-blue-50" : ""}`}>
                        <td className="py-2">{i + 1}</td>
                        <td className="py-2">{p.name}</td>
                        <td className="py-2">{p.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
