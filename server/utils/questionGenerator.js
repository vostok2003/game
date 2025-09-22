// server/utils/questionGenerator.js

/**
 * generateQuestions
 * - Produces an array of { question: String, answer: Number }
 * - Operator is chosen randomly per-question ( +, -, *, / )
 * - Ensures integer results for division and non-negative results for subtraction
 *
 * count: number of questions to generate (default 200)
 */
function generateQuestions(count = 200) {
  const questions = [];
  let difficulty = 1;

  const ops = ["+", "-", "*", "/"];

  for (let i = 0; i < count; i++) {
    // Increase difficulty every 5 questions (keeps previous behaviour)
    if (i > 0 && i % 5 === 0) difficulty++;

    // base magnitude grows with difficulty so numbers get larger
    const maxBase = 10 * difficulty;

    // helper to produce a random integer in [1, max]
    const rnd = (max) => Math.floor(Math.random() * max) + 1;

    // choose an operator at random
    const op = ops[Math.floor(Math.random() * ops.length)];

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
      // multiplication with slightly smaller second factor sometimes for variety
      const a = rnd(Math.max(2, Math.floor(maxBase)));
      const b = rnd(Math.max(2, Math.floor(maxBase / 2)));
      question = `${a} * ${b}`;
      answer = a * b;
    } else {
      // division: ensure integer result
      // pick divisor b and quotient q then compute dividend = b * q
      const b = rnd(Math.max(1, Math.floor(maxBase / 2))) || 1;
      const q = rnd(Math.max(1, Math.floor(maxBase / 2))) || 1;
      const dividend = b * q;
      question = `${dividend} / ${b}`;
      answer = q;
    }

    questions.push({ question, answer });
  }

  return questions;
}

export default generateQuestions;
