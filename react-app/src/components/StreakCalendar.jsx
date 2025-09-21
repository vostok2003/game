// react-app/src/components/StreakCalendar.jsx
import React from "react";

/**
 * days: [{ date: "YYYY-MM-DD", solved: true/false }]
 * Renders a compact 30-day row/mini-calendar similar to LeetCode streak grid.
 */
export default function StreakCalendar({ days = [] }) {
  return (
    <div className="mt-3">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d.date} title={`${d.date} — ${d.solved ? "Solved" : "Missed"}`} className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs ${d.solved ? "bg-green-400 text-white" : "bg-gray-100 text-gray-400"}`}>
            {new Date(d.date).getUTCDate()}
          </div>
        ))}
      </div>
    </div>
  );
}

