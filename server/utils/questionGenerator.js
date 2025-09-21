function generateQuestions(count = 200) {
  const questions = [];
  let difficulty = 1;
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % 5 === 0) difficulty++;
    let a = Math.floor(Math.random() * 10 * difficulty) + 1;
    let b = Math.floor(Math.random() * 10 * difficulty) + 1;
    let opIdx = Math.min(difficulty - 1, 3);
    const ops = ["+", "-", "*", "/"];
    const op = ops[opIdx];
    let question, answer;
    if (op === "+") {
      question = `${a} + ${b}`;
      answer = a + b;
    } else if (op === "-") {
      question = `${a} - ${b}`;
      answer = a - b;
    } else if (op === "*") {
      question = `${a} * ${b}`;
      answer = a * b;
    } else {
      answer = a;
      question = `${a * b} / ${b}`;
    }
    questions.push({ question, answer });
  }
  return questions;
}

export default generateQuestions;
