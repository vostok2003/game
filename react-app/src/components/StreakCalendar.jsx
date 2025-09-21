// src/components/StreakCalendar.jsx
import React, { useMemo, useState, useRef, useLayoutEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

/**
 * StreakCalendar
 * Props:
 *  - days: [{ date: "YYYY-MM-DD", solved: true/false }]
 *  - defaultYear: number|null
 *  - cellSize, gap (appearance)
 *  - onDayClick(dateIso, info) -> called when user clicks a day cell
 *
 * Behavior:
 *  - auto-derives available years from days array (if present)
 *  - displays a single year at a time (selectable)
 *  - emits onDayClick for clicks on in-range days
 */

const DEFAULT_CELL = 12;
const DEFAULT_GAP = 6;
const COLOR_BG = "#ebedf0";
const COLOR_SOLVED = "#2f9e44";

function isoDate(d) {
  return dayjs(d).format("YYYY-MM-DD");
}

function buildLookup(days = []) {
  const map = new Map();
  for (const it of days || []) {
    if (!it || !it.date) continue;
    map.set(isoDate(it.date), !!it.solved);
  }
  return map;
}

function buildAvailableYears(days = []) {
  const years = new Set();
  for (const it of days || []) {
    try {
      const y = dayjs(it.date).utc().year();
      if (!Number.isNaN(y)) years.add(y);
    } catch {}
  }
  const arr = Array.from(years).sort((a, b) => b - a);
  return arr;
}

function buildWeeksForYear(year, { daysLookup }) {
  const startOfYear = dayjs.utc(`${year}-01-01`).startOf("day");
  const endOfYearRaw = dayjs.utc(`${year}-12-31`).endOf("day");
  const today = dayjs.utc().startOf("day");

  let endOfYear;
  if (year === today.year()) {
    endOfYear = endOfYearRaw.isBefore(today) ? endOfYearRaw : today;
  } else {
    endOfYear = endOfYearRaw;
  }

  const start = startOfYear.startOf("week"); // Sunday aligned

  const weeks = [];
  let cursor = start;
  while (cursor.isBefore(endOfYear.add(1, "day"))) {
    const days = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = cursor.add(dow, "day");
      const iso = d.format("YYYY-MM-DD");
      const inRange = !d.isBefore(startOfYear) && !d.isAfter(endOfYear);
      days.push({
        iso,
        solved: !!daysLookup.get(iso),
        inRange,
        dayjsObj: d,
      });
    }
    weeks.push({ startIso: cursor.format("YYYY-MM-DD"), days });
    cursor = cursor.add(7, "day");
    if (weeks.length > 1100) break;
  }

  return { weeks, startOfYear, endOfYear };
}

function computeMonthLabels(weeks) {
  const map = new Map();
  weeks.forEach((w, idx) => {
    for (let r = 0; r < 7; r++) {
      const d = w.days[r];
      if (!d.inRange) continue;
      const monthKey = d.dayjsObj.format("YYYY-MM");
      if (!map.has(monthKey)) map.set(monthKey, idx);
      break;
    }
  });
  return map;
}

export default function StreakCalendar({
  days = [],
  defaultYear = null,
  cellSize = DEFAULT_CELL,
  gap = DEFAULT_GAP,
  onDayClick = null,
}) {
  const daysLookup = useMemo(() => buildLookup(days), [days]);

  const availableYears = useMemo(() => {
    const yrs = buildAvailableYears(days);
    // always include current year even if no days provided
    const cy = dayjs.utc().year();
    if (!yrs.includes(cy)) yrs.unshift(cy);
    return yrs.length ? yrs : [cy];
  }, [days]);

  const [selectedYear, setSelectedYear] = useState(() => {
    if (defaultYear && availableYears.includes(defaultYear)) return defaultYear;
    return availableYears[0];
  });

  // ensure if availableYears changes we keep selection valid
  React.useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]); // eslint-disable-line

  const { weeks } = useMemo(
    () => buildWeeksForYear(selectedYear, { daysLookup }),
    [selectedYear, daysLookup]
  );

  const monthMap = useMemo(() => computeMonthLabels(weeks), [weeks]);

  // layout measuring
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      const w = containerRef.current ? containerRef.current.clientWidth : 0;
      setContainerWidth(w);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const colWidth = cellSize + gap;
  const approxGridWidth = weeks.length * colWidth + 12;
  const stretch = containerWidth > approxGridWidth ? (containerWidth - 12) / Math.max(weeks.length, 1) : null;
  const effectiveColWidth = stretch ? Math.max(colWidth, stretch) : colWidth;
  const effectiveCellSize = stretch ? Math.max(cellSize, effectiveColWidth - gap) : cellSize;
  const padding = 6;

  const colLeft = (colIdx) => Math.round(padding + colIdx * effectiveColWidth);

  const cellStyle = (d) => ({
    width: effectiveCellSize,
    height: effectiveCellSize,
    borderRadius: 4,
    background: d.inRange ? (d.solved ? COLOR_SOLVED : COLOR_BG) : "#f5f7f9",
    opacity: d.inRange ? 1 : 0.22,
    border: "1px solid rgba(0,0,0,0.04)",
    boxSizing: "border-box",
    cursor: d.inRange ? "pointer" : "default",
    transition: "transform .08s ease",
  });

  const handleClick = (d) => {
    if (!d.inRange) return;
    if (typeof onDayClick === "function") {
      onDayClick(d.iso, { date: d.iso, solved: d.solved, inRange: d.inRange });
    }
  };

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-white p-4 rounded shadow-sm">
        <div className="flex items-center justify-between mb-3 gap-4">
          <div>
            <div className="text-lg font-semibold">Activity</div>
            <div className="text-xs text-gray-500">Choose year and explore day-by-day activity</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 mr-2">Year</div>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-1 border rounded bg-white text-sm">
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Month labels */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ height: effectiveCellSize + 8 }} />
          <div style={{ position: "absolute", left: effectiveCellSize + gap, right: 12, top: 0 }}>
            <div style={{ position: "relative", height: 24 }}>
              {Array.from(monthMap.entries()).map(([monthKey, colIdx]) => {
                const left = colLeft(colIdx);
                const label = dayjs.utc(monthKey + "-01").format("MMM");
                return (
                  <div key={monthKey} style={{ position: "absolute", left, transform: "translateX(-6px)", fontSize: 13, fontWeight: 600 }}>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* weekday labels */}
          <div style={{ display: "flex", flexDirection: "column", gap }}>
            <div style={{ height: effectiveCellSize }} />
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ height: effectiveCellSize, fontSize: 12, color: "#666" }}>{d}</div>
            ))}
          </div>

          {/* weeks */}
          <div style={{ overflowX: "auto", width: "100%", paddingBottom: 6 }}>
            <div style={{ display: "inline-flex", gap, padding: padding, minWidth: Math.max(approxGridWidth, containerWidth - 24), alignItems: "flex-start" }}>
              {weeks.map((w) => (
                <div key={w.startIso} style={{ display: "flex", flexDirection: "column", gap }}>
                  {w.days.map((d) => (
                    <div
                      key={d.iso}
                      title={`${d.dayjsObj.format("ddd, MMM D, YYYY")} — ${d.inRange ? (d.solved ? "Solved" : "Missed") : "Out of range"}`}
                      onClick={() => handleClick(d)}
                      onMouseDown={(e) => { if (d.inRange) e.currentTarget.style.transform = "scale(0.98)"; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      style={cellStyle(d)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">Hover or click a day to see details. Use horizontal scroll to view all weeks.</div>
      </div>
    </div>
  );
}
