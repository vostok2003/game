// src/pages/DailyHub.jsx
import React, { useEffect, useState, useContext } from "react";
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

  // calendar clicked day details
  const [pickedDay, setPickedDay] = useState(null); // { date, solved, inRange }

  useEffect(() => {
    loadToday();
    loadStreak();
    loadSeason();
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
      const res = await fetchStreak();
      if (res) setStreak(res);
    } catch (err) {
      setStreak({ currentStreak: 0, days: [] });
    }
  }

  async function loadSeason() {
    const now = new Date();
    try {
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
      alert(`Submitted: practice points ${res.practicePoints || 0}. Badges: ${res.awardedBadges?.join(", ") || "None"}`);
      const lb = await fetchDailyLeaderboard(selected.date, selected.key);
      setLeaderboard(lb.top || []);
      await loadStreak();
      await loadSeason();
    } catch (err) {
      console.error("submitDailyAttempt failed", err);
      alert(err.response?.data?.error || err.message || "Submit failed");
    }
  }

  // calendar click handler
  const handleCalendarClick = async (dateIso, info) => {
    setPickedDay(info);
    // Optionally fetch attempts/comments for that date to show details (non-blocking)
    try {
      // attempt to fetch daily leaderboard for the same section if selected or use 'basic'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-white p-6 rounded shadow mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Practice Hub</h1>
            <p className="text-sm text-gray-600">New set unlocks every day — same for everyone. Build streaks, climb seasonal leaderboards.</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Your rating</div>
            <div className="text-2xl font-semibold text-gray-800">
              {user?.rating ?? 1500} <span className="text-gray-400 text-sm">±{user?.rd ?? 350}</span>
            </div>
          </div>
        </div>

        {/* Streak calendar (full width) */}
        <div className="mb-6">
         <StreakCalendar
  days={streak.days}
  yearsCount={3}
  cellSize={14}
  cellGap={6}
  monthGapPx={18}
  onDayClick={(iso, meta) => { console.log("Day clicked", iso, meta); /* optionally load comments/attempts */ }}
/>
     </div>

        {/* Season leaderboard directly under the streak calendar (full width) */}
        <div className="mb-6">
          <div className="bg-white p-6 rounded shadow">
            <SeasonLeaderboard items={seasonTop} currentUserId={user?._id} currentUserName={user?.name} />
          </div>
        </div>

        {/* Main grid: left -> Today's Sections, right -> Your Streak + date details */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">Today's Sections</h2>
            {loadingDaily ? (
              <div>Loading...</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {today?.sections?.map((s) => (
                  <div key={s.key} className="border rounded p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-lg">{s.title}</div>
                        <div className="text-sm text-gray-500">{s.count} problems</div>
                      </div>
                      <div className="mt-2 text-sm">
                        {s.unlocked ? <span className="text-green-600">Unlocked</span> : <span className="text-red-600">Locked</span>}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className={`px-3 py-2 rounded text-white ${s.unlocked ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`} onClick={() => openSection(s.key)} disabled={!s.unlocked}>
                        Open
                      </button>
                      <button className="px-3 py-2 rounded border text-sm" onClick={async () => {
                        const lb = await fetchDailyLeaderboard(today.date, s.key);
                        setLeaderboard(lb.top || []);
                        setSelected(null);
                      }}>
                        View leaderboard
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Section: {selected.key}</h3>
                  <div className="text-sm text-gray-500">Date: {selected.date}</div>
                </div>

                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 text-gray-800">{i + 1}. {q}</div>
                      <input
                        className="w-28 px-2 py-1 border rounded"
                        value={answers[i]?.answer || ""}
                        onChange={(e) => setAnswerAt(i, e.target.value)}
                        placeholder="your ans"
                        type="text"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-3">
                  <button className="bg-green-600 px-4 py-2 text-white rounded" onClick={handleSubmit}>Submit</button>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Daily Leaderboard</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                      {leaderboard.length === 0 && <li className="text-gray-500">No attempts yet</li>}
                      {leaderboard.map((r, idx) => (
                        <li key={idx}>{r.user.name} — {r.practicePoints} pts ({r.timeTakenSeconds}s)</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Discussion</h4>
                    <Discussion date={selected.date} sectionKey={selected.key} comments={comments} onPosted={async () => {
                      const cm = await fetchComments(selected.date, selected.key);
                      setComments(cm.comments || []);
                    }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-3">Your Streak</h3>
            <div className="mb-4">
              <div className="text-3xl font-bold">{streak.currentStreak}</div>
              <div className="text-sm text-gray-600">days</div>
            </div>

            {/* If user clicked a day, show details here */}
            {pickedDay ? (
              <div className="mt-4 p-3 rounded border bg-gray-50">
                <div className="text-sm text-gray-600">Date</div>
                <div className="font-medium">{pickedDay.date}</div>
                <div className="text-sm mt-2">{pickedDay.inRange ? (pickedDay.solved ? <span className="text-green-600">Solved</span> : <span className="text-red-600">Missed</span>) : <span className="text-gray-500">Out of range</span>}</div>
                <div className="mt-3">
                  <button className="px-3 py-1 rounded bg-white border text-sm" onClick={() => setPickedDay(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Click any day on the calendar above to inspect that day's activity.</div>
            )}

            <div className="mt-6 text-sm text-gray-500">Streaks update when you submit daily attempts.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
