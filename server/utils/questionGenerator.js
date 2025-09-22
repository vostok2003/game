// server/utils/questionGenerator.js

/**
 * generateQuestions
 * - Produces an array of { question: String, answer: Number }
 * - Operator chosen per-question using difficulty-aware weights:
 *     difficulty 1 (easiest): mostly + and -
 *     difficulty 2: more balanced
 *     difficulty >=3 (harder): more * and /
 * - Ensures integer results for division and non-negative subtraction results
 *
 * count: number of questions to generate (default 200)
 */
function pickWeighted(choices) {
  // choices: [{ item: something, weight: number }, ...]
  const total = choices.reduce((s, c) => s + (c.weight || 0), 0);
  if (total <= 0) return choices[0].item;
  let r = Math.random() * total;
  for (const c of choices) {
    r -= (c.weight || 0);
    if (r <= 0) return c.item;
  }
  return choices[choices.length - 1].item;
}

function generateQuestions(count = 200) {
  const questions = [];
  let difficulty = 1;

  // helper to produce a random integer in [1, max]
  const rnd = (max) => Math.floor(Math.random() * Math.max(1, Math.floor(max))) + 1;

  for (let i = 0; i < count; i++) {
    // Increase difficulty every 5 questions (preserves previous behavior)
    if (i > 0 && i % 5 === 0) difficulty++;

    // base magnitude grows with difficulty so numbers get larger
    const maxBase = 10 * difficulty;

    // Choose operator using difficulty-aware weights
    // You can tune these weights if you want a different distribution.
    let op;
    if (difficulty <= 1) {
      // Mostly + and - for easiest tier
      op = pickWeighted([
        { item: "+", weight: 45 },
        { item: "-", weight: 45 },
        { item: "*", weight: 5 },
        { item: "/", weight: 5 },
      ]);
    } else if (difficulty === 2) {
      // Balanced mix: still favor +/- but increased mult/div
      op = pickWeighted([
        { item: "+", weight: 35 },
        { item: "-", weight: 35 },
        { item: "*", weight: 15 },
        { item: "/", weight: 15 },
      ]);
    } else if (difficulty === 3) {
      // More multiplication / division
      op = pickWeighted([
        { item: "+", weight: 25 },
        { item: "-", weight: 20 },
        { item: "*", weight: 25 },
        { item: "/", weight: 30 },
      ]);
    } else {
      // difficulty >= 4: heavy on * and /
      op = pickWeighted([
        { item: "+", weight: 15 },
        { item: "-", weight: 10 },
        { item: "*", weight: 35 },
        { item: "/", weight: 40 },
      ]);
    }

    let question, answer;

    if (op === "+") {
      const a = rnd(maxBase);
      const b = rnd(maxBase);
      question = `${a} + ${b}`;
      answer = a + b;
    } else if (op === "-") {
      // ensure non-negative results by making a >= b
      let a = rnd(maxBase);
      let b = rnd(maxBase);
      if (b > a) [a, b] = [b, a];
      question = `${a} - ${b}`;
      answer = a - b;
    } else if (op === "*") {
      // multiplication; keep numbers reasonable by adjusting second factor
      const a = rnd(Math.max(2, Math.floor(maxBase)));
      const b = rnd(Math.max(2, Math.floor(Math.max(2, maxBase / 2))));
      question = `${a} * ${b}`;
      answer = a * b;
    } else {
      // division: ensure integer result
      // pick divisor b and quotient q then compute dividend = b * q
      // use smaller divisor at low difficulty to keep division simple
      const divisorMax = Math.max(1, Math.floor(maxBase / (difficulty <= 2 ? 3 : 2)));
      const b = rnd(Math.max(1, divisorMax));
      const qMax = Math.max(1, Math.floor(maxBase / (difficulty <= 2 ? 2 : 1)));
      const q = rnd(qMax);
      const dividend = b * q;
      question = `${dividend} / ${b}`;
      answer = q;
    }

    questions.push({ question, answer });
  }

  return questions;
}

export default generateQuestions;
