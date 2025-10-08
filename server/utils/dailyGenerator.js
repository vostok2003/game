// server/utils/dailyGenerator.js
import generateQuestions from "./questionGenerator.js";

/**
 * Create sections with increasing difficulty.
 * You can tune counts per section.
 */
export function createDailyProblemsForDate(dateStr) {
  const specs = [
    { key: "basic", title: "Basic", count: 8 },
    { key: "intermediate", title: "Intermediate", count: 8 },
    { key: "advanced", title: "Advanced", count: 6 },
    { key: "elite", title: "Elite", count: 4 },
  ];

  const sections = specs.map((s, idx) => {
    // generateQuestions supports difficulty by making numbers larger every 5 items; call with count*2 and slice to add variety
    const problems = generateQuestions(s.count).map((q) => ({
      question: q.question,
      answer: q.answer,
      solution: q.answer.toString(), // default solution; you can expand later
    }));
    return { key: s.key, title: s.title, problems };
  });

  return { date: dateStr, sections };
}
