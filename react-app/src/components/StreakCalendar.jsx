// src/components/StreakCalendar.jsx
import React, { useMemo, useState, useRef, useLayoutEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Custom Tooltip component since we're not using Mantine
const Tooltip = ({ label, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);

  const handleMouseMove = (e) => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onMouseMove={handleMouseMove}
      ref={tooltipRef}
    >
      {children}
      {isVisible && (
        <div 
          className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap"
          style={{
            top: position === 'bottom' ? '100%' : 'auto',
            bottom: position === 'top' ? '100%' : 'auto',
            left: coords.x,
            transform: 'translateX(-50%)',
            marginTop: position === 'bottom' ? '4px' : undefined,
            marginBottom: position === 'top' ? '4px' : undefined,
          }}
        >
          {label}
          <div 
            className="absolute w-2 h-2 bg-gray-900 rotate-45"
            style={{
              left: '50%',
              top: position === 'bottom' ? '-4px' : 'auto',
              bottom: position === 'top' ? '-4px' : 'auto',
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        </div>
      )}
    </div>
  );
};
import { motion } from "framer-motion";
dayjs.extend(utc);

// Mathematical symbols for different day states
const SYMBOLS = {
  solved: '✓',
  missed: '×',
  future: '∘',
  today: '●'
};

// Color scheme
const COLORS = {
  background: 'rgba(30, 41, 59, 0.7)',
  solved: 'rgba(74, 222, 128, 0.9)',
  missed: 'rgba(248, 113, 113, 0.7)',
  future: 'rgba(148, 163, 184, 0.2)',
  today: 'rgba(96, 165, 250, 0.9)',
  text: 'rgba(241, 245, 249, 0.9)',
  grid: 'rgba(148, 163, 184, 0.1)'
};

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
    const weeks = month.weeks;
    const weeksCount = weeks.length;
    const colWidth = cellSize;
    const columnGap = cellGap;
    const blockWidth = weeksCount * (colWidth + columnGap);
    const today = dayjs.utc().format('YYYY-MM-DD');

    return (
      <div
        key={`${keyPrefix}-m${month.monthIndex}`}
        className="inline-block align-top relative group"
        style={{ 
          marginRight: monthGapPx, 
          minWidth: Math.min(blockWidth + 8, containerWidth * 0.9),
          background: 'rgba(15, 23, 42, 0.3)',
          borderRadius: '12px',
          padding: '12px 8px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="text-center mb-3 text-sm font-medium text-blue-100">
          <span className="text-indigo-300">{month.monthLabel}</span>
          <span className="text-xs text-blue-400 ml-1">{month.startOfMonth.year()}</span>
        </div>

        {/* Day headers */}
        <div className="flex justify-center gap-1 mb-2 px-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="w-5 h-5 flex items-center justify-center text-[10px] text-blue-300/60">
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: columnGap, alignItems: "flex-start", overflow: "visible" }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: columnGap }}>
              {week.map((d, di) => {
                const isToday = d.iso === today;
                const isFuture = dayjs(d.iso).isAfter(dayjs(), 'day');
                const dayState = !d.inMonth ? 'future' : isToday ? 'today' : isFuture ? 'future' : d.solved ? 'solved' : 'missed';
                const symbol = SYMBOLS[dayState];
                const bgColor = COLORS[dayState];
                
                return (
                  <Tooltip
                    key={di}
                    label={`${d.dayjsObj.format("dddd, MMMM D, YYYY")} — ${
                      !d.inMonth ? "Outside month" : 
                      isToday ? "Today" : 
                      isFuture ? "Upcoming" :
                      d.solved ? `✓ Solved` : "Missed"
                    }`}
                    position="top"
                    transitionProps={{ transition: 'pop' }}
                    withArrow
                    withinPortal
                  >
                    <motion.div
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { 
                        if (d.inMonth && typeof onDayClick === "function") 
                          onDayClick(d.iso, { iso: d.iso, solved: d.solved }); 
                      }}
                      className="relative flex items-center justify-center"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: '6px',
                        background: bgColor,
                        boxShadow: isToday ? `0 0 0 2px ${COLORS.today}` : 'none',
                        cursor: d.inMonth ? 'pointer' : 'default',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {symbol}
                      {isToday && (
                        <motion.div 
                          className="absolute inset-0 rounded-md"
                          style={{
                            border: `1px solid ${COLORS.today}`,
                            boxShadow: `0 0 8px ${COLORS.today}`
                          }}
                          animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.05, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                        />
                      )}
                    </motion.div>
                  </Tooltip>
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
    const currentStreak = calculateCurrentStreak(daysLookup);
    
    return (
      <motion.div 
        key={`year-${year}`} 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white font-mono">
              <span className="bg-gradient-to-r from-indigo-300 to-blue-300 bg-clip-text text-transparent">
                Activity Matrix
              </span>
              <span className="text-blue-400 ml-2">{year}</span>
            </h3>
            {currentStreak > 0 && (
              <div className="px-2 py-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full border border-emerald-500/30 text-xs text-emerald-200">
                🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''} streak
              </div>
            )}
          </div>
          <div className="text-xs text-blue-300/60 mt-1 sm:mt-0">
            Daily consistency: {calculateConsistency(daysLookup)}%
          </div>
        </div>

        <div className="relative">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `
              linear-gradient(to right, ${COLORS.grid} 1px, transparent 1px),
              linear-gradient(to bottom, ${COLORS.grid} 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            borderRadius: '12px',
            pointerEvents: 'none'
          }} />
          
          <div className="relative overflow-x-auto py-4 px-2 rounded-xl" style={{
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ 
              display: "flex", 
              gap: monthGapPx, 
              alignItems: "flex-start",
              minWidth: 'max-content',
              padding: '0 12px 8px'
            }}>
              {months.map((m) => renderMonthBlock(m, String(year)))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Helper function to calculate current streak
  function calculateCurrentStreak(lookup) {
    let currentStreak = 0;
    let currentDate = dayjs.utc();
    
    while (true) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      if (!lookup.has(dateStr) || !lookup.get(dateStr)) break;
      currentStreak++;
      currentDate = currentDate.subtract(1, 'day');
    }
    
    return currentStreak;
  }
  
  // Helper function to calculate consistency percentage
  function calculateConsistency(lookup) {
    const days = Array.from(lookup.entries());
    if (days.length === 0) return 0;
    
    const solvedDays = days.filter(([_, solved]) => solved).length;
    return Math.round((solvedDays / days.length) * 100);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Year selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6 px-2">
        <div className="text-sm font-medium text-blue-200 flex items-center">
          <span className="mr-2">Time Domain:</span>
          <span className="text-xs bg-blue-900/50 px-2 py-1 rounded-md text-blue-200">t ∈</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {availableYears.map((y) => (
            <motion.button
              key={y}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleYear(y)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
                selectedYears.includes(y)
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 text-blue-200 hover:bg-white/10 border border-white/10"
              }`}
            >
              {y}
              {selectedYears.includes(y) && (
                <motion.span 
                  className="ml-1.5"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>
        
        {availableYears.length > 1 && (
          <div className="flex items-center gap-2 ml-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={selectAll}
              className="px-3 py-1 text-xs rounded-lg bg-white/5 text-blue-200 hover:bg-white/10 border border-white/10 transition-colors"
            >
              ∀ Years
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearAll}
              className="px-3 py-1 text-xs rounded-lg bg-white/5 text-rose-200 hover:bg-rose-500/20 border border-white/10 transition-colors"
            >
              Clear
            </motion.button>
            <label className="flex items-center gap-1 text-xs text-blue-200 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              <input
                type="checkbox"
                checked={multiMode}
                onChange={(e) => setMultiMode(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-blue-400 focus:ring-blue-500"
              />
              <span>Multi-select</span>
            </label>
          </div>
        )}
      </div>

      {/* Calendar content */}
      <div className="relative">
        {selectedYears.length === 0 ? (
          <motion.div 
            className="text-center py-12 px-4 rounded-xl bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-white/10 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-medium text-blue-100 mb-1">No Time Domain Selected</h3>
            <p className="text-blue-300/80 text-sm max-w-md mx-auto">
              Select one or more years to visualize your activity matrix. 
              Track your consistency and build better habits over time.
            </p>
            <motion.button
              onClick={selectAll}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-lg hover:shadow-blue-500/20 transition-all"
            >
              Show All Years
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {selectedYears.map((y) => renderYear(y))}
          </motion.div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-blue-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/90"></div>
          <span>Solved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-rose-500/80"></div>
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500/80"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-slate-600/50"></div>
          <span>Future</span>
        </div>
      </div>
    </div>
  );
}
