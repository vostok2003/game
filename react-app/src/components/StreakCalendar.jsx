// src/components/StreakCalendar.jsx
import React, { useMemo, useState, useRef, useLayoutEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

/**
 * StreakCalendar — single-year spreadable view
 *
 * Props:
 *  - days: [{ date: "YYYY-MM-DD", solved: true/false }]
 *  - yearsRange: number (how many recent years appear in selector) default 3
 *  - defaultYear: number | null
 *  - cellSize: number (default 14)
 *  - gap: number (default 6)
 */

const DEFAULT_CELL = 14;
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

function buildWeeksForYear(year, { daysLookup }) {
  const startOfYear = dayjs.utc(`${year}-01-01`).startOf("day");
  const endOfYearRaw = dayjs.utc(`${year}-12-31`).endOf("day");
  const today = dayjs.utc().startOf("day");

  let endOfYear;
  if (year === today.year()) {
    // cap end date at today for current year
    endOfYear = endOfYearRaw.isBefore(today) ? endOfYearRaw : today;
  } else {
    endOfYear = endOfYearRaw;
  }

  const start = startOfYear.startOf("week"); // align to Sunday

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
    if (weeks.length > 1000) break; // safety
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
  return map; // monthKey -> col index
}

export default function StreakCalendar({
  days = [],
  yearsRange = 3,
  defaultYear = null,
  cellSize = DEFAULT_CELL,
  gap = DEFAULT_GAP,
}) {
  const daysLookup = useMemo(() => buildLookup(days), [days]);

  const currentYear = dayjs.utc().year();
  const years = useMemo(() => {
    const arr = [];
    for (let i = 0; i < Math.max(1, yearsRange); i++) arr.push(currentYear - i);
    return arr;
  }, [yearsRange, currentYear]);

  const [selectedYear, setSelectedYear] = useState(() => {
    if (defaultYear && years.includes(defaultYear)) return defaultYear;
    return currentYear;
  });

  const { weeks } = useMemo(
    () => buildWeeksForYear(selectedYear, { daysLookup }),
    [selectedYear, daysLookup]
  );

  const monthMap = useMemo(() => computeMonthLabels(weeks), [weeks]);

  // Refs & layout calculations to spread grid nicely
  const containerRef = useRef(null);
  const weeksRef = useRef(null);
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
  const stretch =
    containerWidth > approxGridWidth
      ? (containerWidth - 12) / Math.max(weeks.length, 1)
      : null;

  const effectiveColWidth = stretch ? Math.max(colWidth, stretch) : colWidth;
  const effectiveCellSize = stretch
    ? Math.max(cellSize, effectiveColWidth - gap)
    : cellSize;

  const colLeft = (colIdx) => {
    const padding = 6;
    return Math.round(padding + colIdx * effectiveColWidth);
  };

  const cellStyle = (d) => ({
    width: effectiveCellSize,
    height: effectiveCellSize,
    borderRadius: 4,
    background: d.inRange ? (d.solved ? COLOR_SOLVED : COLOR_BG) : "#f5f7f9",
    opacity: d.inRange ? 1 : 0.22,
    border: "1px solid rgba(0,0,0,0.04)",
    boxSizing: "border-box",
  });

  return (
    <div
      ref={containerRef}
      className="streak-calendar w-full"
      style={{
        fontFamily: `Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`,
      }}
    >
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h3 className="text-xl font-semibold">Activity — {selectedYear}</h3>
            <div className="text-sm text-gray-600">Each square = one day</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: effectiveCellSize,
                    height: effectiveCellSize,
                    background: COLOR_BG,
                    borderRadius: 4,
                  }}
                />{" "}
                None
              </div>
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: effectiveCellSize,
                    height: effectiveCellSize,
                    background: COLOR_SOLVED,
                    borderRadius: 4,
                  }}
                />{" "}
                Solved
              </div>
            </div>
            <div>
              <label htmlFor="year-select" className="sr-only">
                Year
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border rounded bg-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Month labels */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ height: effectiveCellSize + 8 }} />
          <div
            style={{
              position: "absolute",
              left: effectiveCellSize + gap,
              right: 12,
              top: 0,
            }}
          >
            <div style={{ position: "relative", height: 24 }}>
              {Array.from(monthMap.entries()).map(([monthKey, colIdx]) => {
                const left = colLeft(colIdx);
                const label = dayjs.utc(monthKey + "-01").format("MMM");
                return (
                  <div
                    key={monthKey}
                    style={{
                      position: "absolute",
                      left,
                      transform: "translateX(-6px)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Weekday labels */}
          <div style={{ display: "flex", flexDirection: "column", gap }}>
            <div style={{ height: effectiveCellSize }} />
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                style={{ height: effectiveCellSize, fontSize: 13, color: "#666" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Weeks container */}
          <div
            style={{ overflowX: "auto", width: "100%", paddingBottom: 6 }}
            ref={weeksRef}
          >
            <div
              style={{
                display: "inline-flex",
                gap: gap,
                padding: 6,
                minWidth: Math.max(approxGridWidth, containerWidth - 24),
                alignItems: "flex-start",
              }}
            >
              {weeks.map((w) => (
                <div
                  key={w.startIso}
                  style={{ display: "flex", flexDirection: "column", gap }}
                >
                  {w.days.map((d) => (
                    <div
                      key={d.iso}
                      title={`${d.dayjsObj.format(
                        "ddd, MMM D, YYYY"
                      )} — ${
                        d.inRange
                          ? d.solved
                            ? "Solved"
                            : "Missed"
                          : "Out of range"
                      }`}
                      style={cellStyle(d)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Tip: Hover any square to see the date and status. Use horizontal scroll
          if the grid is wide.
        </div>
      </div>
    </div>
  );
}
