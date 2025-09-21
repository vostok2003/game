import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import getSocket from "../socket";
const socket = getSocket();

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const name = user?.name || "";
  // Try to get state from location or localStorage
  let {
    roomCode,
    players: initialPlayers,
    questions: initialQuestions,
    mode: initialMode,
  } = location.state || {};
  if (!roomCode) {
    const saved = JSON.parse(localStorage.getItem("gameState"));
    if (saved) {
      roomCode = saved.roomCode;
      initialPlayers = saved.players;
      initialQuestions = saved.questions;
      initialMode = saved.mode;
    }
  }
  const [questions, setQuestions] = useState(initialQuestions || []);
  const [mode, setMode] = useState(initialMode || 1);
  const [answer, setAnswer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [players, setPlayers] = useState(initialPlayers || []);
  const [timer, setTimer] = useState(mode ? mode * 60 : 0); // seconds
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef();

  // Persist game state in localStorage
  useEffect(() => {
    if (roomCode && questions && mode) {
      localStorage.setItem(
        "gameState",
        JSON.stringify({ roomCode, players, questions, mode })
      );
    }
  }, [roomCode, players, questions, mode]);

  // On mount, always rejoin room to ensure socket is tracked
  useEffect(() => {
    if (!roomCode) return;
    socket.emit("rejoinRoom", { roomCode, name }, (data) => {
      if (data.error) {
        alert(data.error);
        navigate("/");
        return;
      }
      setPlayers(data.players);
      setTimer(typeof data.timeLeft === "number" ? data.timeLeft : mode * 60);
      setCurrentQuestion(data.playerState?.current || 0);
      setScore(data.playerState?.score || 0);
      setQuestions(data.questions || []);
      setMode(data.mode || 1);
      // Save questions and mode for future refreshes
      localStorage.setItem(
        "gameState",
        JSON.stringify({
          roomCode: data.roomCode,
          players: data.players,
          questions: data.questions,
          mode: data.mode,
        })
      );
    });
  }, [roomCode, navigate]);

  // Listen for timer updates from backend
  useEffect(() => {
    function handleTimerUpdate({ timeLeft }) {
      setTimer(timeLeft);
      if (timeLeft <= 0) setGameOver(true);
    }
    socket.on("timerUpdate", handleTimerUpdate);
    // On mount, request current timer value
    socket.emit("getTimer", {}, ({ timeLeft }) => {
      if (typeof timeLeft === "number") setTimer(timeLeft);
    });
    return () => {
      socket.off("timerUpdate", handleTimerUpdate);
    };
  }, []);

  // Listen for progress updates
  useEffect(() => {
    function handleProgressUpdate(newPlayers) {
      setPlayers(newPlayers);
      const me = newPlayers.find((p) => p.name === name);
      if (me) {
        setScore(me.score);
        setCurrentQuestion(me.current);
      }
    }
    socket.on("progressUpdate", handleProgressUpdate);
    return () => {
      socket.off("progressUpdate", handleProgressUpdate);
    };
  }, [name]);

  // End game if all questions answered
  useEffect(() => {
    if (currentQuestion >= questions.length) {
      setGameOver(true);
    }
  }, [currentQuestion, questions.length]);

  // Navigate to results when game is over
  useEffect(() => {
    if (gameOver) {
      setTimeout(() => {
        navigate("/results", { state: { players, score } });
      }, 1000);
    }
  }, [gameOver, navigate, players, score]);

  useEffect(() => {
    function handleRematchStarted({ questions, mode, players }) {
      setPlayers(players);
      setScore(0);
      setCurrentQuestion(0);
      setGameOver(false);
      setAnswer("");
      setQuestions(questions);
      setMode(mode);
      // Save new game state
      localStorage.setItem(
        "gameState",
        JSON.stringify({ roomCode, players, questions, mode })
      );
      // Always request timer from backend after rematch
      socket.emit("getTimer", {}, ({ timeLeft }) => {
        if (typeof timeLeft === "number") setTimer(timeLeft);
      });
    }
    function handleGameStarted({ questions: qs, mode: m }) {
      setCurrentQuestion(0);
      setScore(0);
      setGameOver(false);
      setAnswer("");
      setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, current: 0 })));
      setQuestions(qs);
      setMode(m);
      // Save new game state
      localStorage.setItem(
        "gameState",
        JSON.stringify({ roomCode, players, questions: qs, mode: m })
      );
      // Always request timer from backend after game start
      socket.emit("getTimer", {}, ({ timeLeft }) => {
        if (typeof timeLeft === "number") setTimer(timeLeft);
      });
    }
    socket.on("rematchStarted", handleRematchStarted);
    socket.on("gameStarted", handleGameStarted);
    return () => {
      socket.off("rematchStarted", handleRematchStarted);
      socket.off("gameStarted", handleGameStarted);
    };
  }, [roomCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (gameOver) return;
    socket.emit(
      "submitAnswer",
      { answer },
      ({ correct, nextQuestion, score: newScore }) => {
        if (correct) {
          setAnswer("");
          setScore(newScore);
          setCurrentQuestion((cq) => cq + 1);
        }
      }
    );
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <div className="flex justify-between mb-4">
          <span className="text-lg font-semibold text-blue-700">
            Time: {formatTime(timer)}
          </span>
          <span className="text-lg font-semibold text-green-700">
            Score: {score}
          </span>
        </div>
        <div className="mb-6">
          {gameOver ? (
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              Game Over!
            </h2>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2 text-gray-800">
                {questions[currentQuestion]}
              </h2>
              <form
                onSubmit={handleSubmit}
                className="flex gap-2 justify-center"
              >
                <input
                  type="number"
                  className="w-32 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-center"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your answer"
                  autoFocus
                  disabled={gameOver}
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  disabled={gameOver}
                >
                  Submit
                </button>
              </form>
            </>
          )}
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">
            Players Progress
          </h3>
          <div className="flex flex-col gap-2">
            {players.map((p, i) => (
              <div
                key={i}
                className="flex justify-between bg-gray-100 rounded px-3 py-1"
              >
                <span>{p.name}</span>
                <span>
                  Score: {p.score} | Q: {p.current + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
