// src/components/StreakCalendar.jsx
import React, { useMemo, useState, useRef, useLayoutEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

/**
 * StreakCalendar
 *
 * - Renders months as separate blocks (so days for a month are always under that month).
 * - Adds visible horizontal gap between months (monthGapPx).
 * - Allows selecting multiple years; by default shows last `yearsCount` years (including current).
 *
 * Props:
 *  - days: [{ date: "YYYY-MM-DD", solved: true/false }]
 *  - yearsCount: number (default 3) -> number of recent years to show in selector
 *  - cellSize: px per day square (default 14)
 *  - cellGap: px gap between day cells within a week (default 6)
 *  - monthGapPx: px extra gap between months (default 18)
 *  - onDayClick(dateIso, meta) optional
 */

const DEFAULT_CELL = 14;
const DEFAULT_GAP = 6;
const DEFAULT_MONTH_GAP = 18;

function iso(d) {
  return dayjs.utc(d).format("YYYY-MM-DD");
}

function buildLookup(days = []) {
  const map = new Map();
  for (const it of days || []) {
    if (!it || !it.date) continue;
    map.set(iso(it.date), !!it.solved);
  }
  return map;
}

/** Return array of months for a year [1..12] each contains weeks (each week is 7 day objects) */
function buildYearMonths(year, daysLookup) {
  // For each month, build weeks that cover that month (start from the Sunday on/before month start)
  const months = [];
  for (let m = 0; m < 12; m++) {
    const startOfMonth = dayjs.utc(`${year}-${String(m + 1).padStart(2, "0")}-01`).startOf("day");
    const endOfMonth = startOfMonth.endOf("month");
    // week grid starts at Sunday on or before startOfMonth
    const gridStart = startOfMonth.startOf("week");
    // grid ends at Saturday on or after endOfMonth
    const gridEnd = endOfMonth.endOf("week");
    const weeks = [];
    let cursor = gridStart;
    while (cursor.isBefore(gridEnd.add(1, "day"))) {
      const daysRow = [];
      for (let dow = 0; dow < 7; dow++) {
        const d = cursor.add(dow, "day");
        const inMonth = d.isSame(startOfMonth, "month");
        daysRow.push({
          iso: d.format("YYYY-MM-DD"),
          solved: !!daysLookup.get(d.format("YYYY-MM-DD")),
          inMonth,
          dayjsObj: d,
        });
      }
      weeks.push(daysRow);
      cursor = cursor.add(7, "day");
      if (weeks.length > 10_000) break; // safety
    }
    months.push({
      monthIndex: m,
      monthLabel: startOfMonth.format("MMM"),
      weeks,
      startOfMonth,
      endOfMonth,
    });
  }
  return months;
}

export default function StreakCalendar({
  days = [],
  yearsCount = 3,
  cellSize = DEFAULT_CELL,
  cellGap = DEFAULT_GAP,
  monthGapPx = DEFAULT_MONTH_GAP,
  onDayClick = null,
}) {
  const daysLookup = useMemo(() => buildLookup(days), [days]);

  // available years default: current and previous (yearsCount - 1)
  const currentYear = dayjs.utc().year();
  const availableYears = useMemo(() => {
    const arr = [];
    for (let i = 0; i < yearsCount; i++) arr.push(currentYear - i);
    return arr;
  }, [currentYear, yearsCount]);

  // selection state: multi-mode toggle + selected years
  const [multiMode, setMultiMode] = useState(false);
  const [selectedYears, setSelectedYears] = useState([availableYears[0]]);

  // ensure selection remains valid if years list changes
  React.useEffect(() => {
    setSelectedYears((prev) => {
      const valid = prev.filter((y) => availableYears.includes(y));
      return valid.length ? valid : [availableYears[0]];
    });
  }, [availableYears]);

  // layout
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  useLayoutEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      setContainerWidth(containerRef.current.clientWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // toggle year selection
  function toggleYear(y) {
    setSelectedYears((prev) => {
      if (prev.includes(y)) return prev.filter((x) => x !== y);
      return multiMode ? [...prev, y].sort((a, b) => b - a) : [y];
    });
  }

  function selectAll() {
    setSelectedYears([...availableYears]);
  }
  function clearAll() {
    setSelectedYears([]);
  }

  // Render one month block (vertical stack of day cells per week)
  function renderMonthBlock(month, keyPrefix) {
    // number of weeks in this month block (weeks array length)
    const weeks = month.weeks;
    const weeksCount = weeks.length;
    const colWidth = cellSize; // each day square width
    const columnGap = cellGap;
    const blockWidth = weeksCount * (colWidth + columnGap);

    return (
      <div
        key={keyPrefix + "-m" + month.monthIndex}
        className="inline-block align-top"
        style={{ marginRight: monthGapPx, minWidth: Math.min(blockWidth + 8, containerWidth * 0.9) }}
      >
        <div className="text-center mb-2 text-sm font-medium text-slate-700">{month.monthLabel}</div>

        <div style={{ display: "flex", gap: columnGap, alignItems: "flex-start", overflow: "visible", padding: 4 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: columnGap }}>
              {week.map((d, di) => {
                const inMonth = d.inMonth;
                const bg = inMonth ? (d.solved ? "#16a34a" : "#ebedf0") : "#f8fafc";
                const opacity = inMonth ? 1 : 0.28;
                return (
                  <div
                    key={di}
                    title={`${d.dayjsObj.format("ddd, MMM D, YYYY")} — ${inMonth ? (d.solved ? "Solved" : "Missed") : "Outside month"}`}
                    onClick={() => { if (inMonth && typeof onDayClick === "function") onDayClick(d.iso, { iso: d.iso, solved: d.solved }); }}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 4,
                      background: bg,
                      opacity,
                      boxSizing: "border-box",
                      border: "1px solid rgba(0,0,0,0.04)",
                      cursor: inMonth ? "pointer" : "default",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Build months for a given year
  function renderYear(year) {
    const months = buildYearMonths(year, daysLookup);
    return (
      <div key={"year-" + year} className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Activity — {year}</div>
          <div className="text-xs text-slate-500">Each small square = one day</div>
        </div>

        <div style={{ overflowX: "auto", padding: 8, borderRadius: 8, border: "1px solid rgba(15,23,42,0.04)", background: "#fff" }}>
          <div style={{ display: "flex", gap: monthGapPx, alignItems: "flex-start", paddingBottom: 6 }}>
            {months.map((m) => renderMonthBlock(m, String(year)))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold">Activity</h3>
            <div className="text-sm text-slate-500">Each square = one day. Weeks flow top → bottom inside each month block.</div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={multiMode} onChange={(e) => setMultiMode(e.target.checked)} />
              <span>Multi-year</span>
            </label>

            <div className="border rounded px-2 py-1 bg-white">
              {!multiMode ? (
                <select
                  value={selectedYears[0] ?? ""}
                  onChange={(e) => setSelectedYears([Number(e.target.value)])}
                  className="text-sm"
                >
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              ) : (
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div className="text-xs text-slate-600">Years</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={selectAll} className="text-xs text-slate-600 hover:underline">All</button>
                      <button onClick={clearAll} className="text-xs text-slate-600 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 140, overflowY: "auto" }}>
                    {availableYears.map((y) => (
                      <label key={y} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                        <input type="checkbox" checked={selectedYears.includes(y)} onChange={() => toggleYear(y)} />
                        <span className="text-sm">{y}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {selectedYears.length === 0 ? (
          <div className="p-3 rounded border border-dashed text-sm text-slate-500">No year selected</div>
        ) : (
          <div>
            {selectedYears.slice().sort((a, b) => b - a).map((y) => renderYear(y))}
          </div>
        )}
      </div>
    </div>
  );
}
