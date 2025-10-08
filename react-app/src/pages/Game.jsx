// client/src/pages/Game.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import getSocket from "../socket";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useLayoutEffect } from "react";
const socket = getSocket();

// Mathematical symbols for background animation
const mathSymbols = ['∑', '∫', '∆', '∞', 'π', '√', '∂', '∇', '∈', '∀', '∃', '⊂', '⊃', '∪', '∩', '≡', '≠', '≤', '≥', '±', '×', '÷', '∝', '∴', '∵', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω'];

// Generate random math symbols for background
const generateSymbols = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
    size: Math.random() * 1.5 + 0.5,
    left: Math.random() * 100,
    top: Math.random() * 100,
    opacity: Math.random() * 0.1 + 0.05,
    animationDuration: Math.random() * 30 + 20,
    animationDelay: Math.random() * 5,
    rotate: Math.random() * 360
  }));
};

// Animation variants
const questionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  },
  exit: { opacity: 0, y: -20 }
};

const playerBarVariants = {
  hidden: { width: 0 },
  visible: (custom) => ({
    width: `${custom}%`,
    transition: { duration: 0.8, ease: "easeOut" }
  })
};

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();
  const name = user?.name || "";
  // Try to get state from location or localStorage
  let {
    roomCode,
    players: initialPlayers,
    questions: initialQuestions,
    mode: initialMode,
  } = location.state || {};
  if (!roomCode) {
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem("gameState"));
      } catch {
        return null;
      }
    })();
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
  const [symbols] = useState(() => generateSymbols(25));
  const [showCorrect, setShowCorrect] = useState(false);
  const [showIncorrect, setShowIncorrect] = useState(false);
  const timerRef = useRef();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Persist game state in localStorage
  useEffect(() => {
    if (roomCode && questions && mode) {
      try {
        localStorage.setItem(
          "gameState",
          JSON.stringify({ roomCode, players, questions, mode })
        );
      } catch {}
    }
  }, [roomCode, players, questions, mode]);

  // On mount, always rejoin room to ensure socket is tracked
  useEffect(() => {
    if (!roomCode) return;
    socket.emit("rejoinRoom", { roomCode, name }, (data) => {
      if (data?.error) {
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
      try {
        localStorage.setItem(
          "gameState",
          JSON.stringify({
            roomCode: data.roomCode,
            players: data.players,
            questions: data.questions,
            mode: data.mode,
          })
        );
      } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, navigate]);

  // Listen for timer updates from backend
  useEffect(() => {
    function handleTimerUpdate({ timeLeft }) {
      setTimer(timeLeft);
      if (timeLeft <= 0) setGameOver(true);
    }
    socket.on("timerUpdate", handleTimerUpdate);
    // On mount, request current timer value
    socket.emit("getTimer", {}, ({ timeLeft } = {}) => {
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
      const me = newPlayers.find((p) => p.name === name || (p.userId && user?._id && String(p.userId) === String(user._id)));
      if (me) {
        setScore(me.score);
        setCurrentQuestion(me.current);
      }
    }
    socket.on("progressUpdate", handleProgressUpdate);
    return () => {
      socket.off("progressUpdate", handleProgressUpdate);
    };
  }, [name, user]);

  // End game if all questions answered locally
  useEffect(() => {
    if (currentQuestion >= questions.length && questions.length > 0) {
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
      try {
        localStorage.setItem(
          "gameState",
          JSON.stringify({ roomCode, players, questions, mode })
        );
      } catch {}
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
      try {
        localStorage.setItem(
          "gameState",
          JSON.stringify({ roomCode, players, questions: qs, mode: m })
        );
      } catch {}
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
  }, [roomCode, players]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (gameOver) return;

    // block empty submissions (prevent skipping)
    if (String(answer).trim() === "") {
      toast.error("Enter an answer before submitting.");
      return;
    }

    // emit to server; server will only advance on correct answers
    socket.emit(
      "submitAnswer",
      { answer },
      ({ correct, nextQuestion, score: newScore, error, currentQuestion: serverCurrent }) => {
        if (error) {
          // server-level error (invalid index etc.)
          alert(error);
          return;
        }
        if (correct) {
          setAnswer("");
          setScore(newScore);
          // Use server supplied current index if provided
          if (typeof serverCurrent === "number") setCurrentQuestion(serverCurrent);
          else setCurrentQuestion((cq) => cq + 1);
          toast.success("Correct!"); // brief feedback
        } else {
          // incorrect — keep user on same question and give feedback
          toast.error("Wrong answer — try again.");
          // ensure local currentQuestion matches server
          if (typeof serverCurrent === "number") setCurrentQuestion(serverCurrent);
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

  // Calculate progress percentage
  const progress = questions.length > 0 
    ? Math.min(100, Math.max(0, (currentQuestion / questions.length) * 100))
    : 0;

  // Find current player
  const currentPlayer = players.find(p => p.name === name || (p.userId && user?._id && String(p.userId) === String(user._id)));
  const maxScore = players.reduce((max, p) => Math.max(max, p.score), 0);

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900"
      ref={containerRef}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Mathematical Symbols */}
        {symbols.map((symbol) => (
          <div
            key={symbol.id}
            className="absolute text-blue-200/20 font-bold pointer-events-none select-none"
            style={{
              fontSize: `${symbol.size}rem`,
              left: `${symbol.left}%`,
              top: `${symbol.top}%`,
              opacity: symbol.opacity,
              transform: `rotate(${symbol.rotate}deg)`,
              animation: `float ${symbol.animationDuration}s ease-in-out ${symbol.animationDelay}s infinite`
            }}
          >
            {symbol.symbol}
          </div>
        ))}

        {/* Gradient Mesh Background */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 25%),
            radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.15) 0%, transparent 25%),
            radial-gradient(circle at 40% 60%, rgba(59, 130, 246, 0.15) 0%, transparent 25%)
          `,
          backgroundSize: '100% 100%',
          animation: 'pulse 15s ease-in-out infinite alternate'
        }}></div>
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)'
        }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-4">
        <motion.div 
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-400/30 rounded-br-lg"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-400/30 rounded-bl-lg"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-400/30 rounded-tr-lg"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-400/30 rounded-tl-lg"></div>
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">🧮</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Math Challenge</h1>
                <div className="text-blue-300 text-sm font-mono">
                  Room: <span className="text-white font-bold">{roomCode}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/10 text-center">
                <div className="text-blue-300 text-xs font-mono">Time</div>
                <div className="text-white font-bold text-xl font-mono">
                  {formatTime(timer)}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/10 text-center">
                <div className="text-blue-300 text-xs font-mono">Score</div>
                <div className="text-green-400 font-bold text-xl">{score}</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-blue-300 mb-1">
              <span>Question {Math.min(currentQuestion + 1, questions.length)} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
          
          {/* Question Area */}
          <div className="mb-8 min-h-[200px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {gameOver ? (
                <motion.div 
                  key="game-over"
                  className="text-center py-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="text-4xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 mb-2">
                    Game Over!
                  </h2>
                  <p className="text-blue-200">Your final score: <span className="text-white font-bold">{score}</span></p>
                </motion.div>
              ) : (
                <motion.div 
                  key={`question-${currentQuestion}`}
                  variants={questionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative"
                >
                  {/* Feedback Overlay */}
                  <AnimatePresence>
                    {showCorrect && (
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                      >
                        <div className="text-8xl text-green-400">✓</div>
                      </motion.div>
                    )}
                    {showIncorrect && (
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                      >
                        <div className="text-8xl text-red-400">✗</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <h2 className="text-3xl font-bold text-white mb-8 font-mono">
                    {questions[currentQuestion]}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="number"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-2xl text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="?"
                        autoFocus
                        disabled={gameOver}
                      />
                      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-blue-300 text-xl">
                        =
                      </div>
                    </div>
                    <motion.button
                      type="submit"
                      className={`mt-6 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-500 hover:to-purple-500 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 ${gameOver ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={gameOver}
                      whileHover={!gameOver ? { scale: 1.02 } : {}}
                      whileTap={!gameOver ? { scale: 0.98 } : {}}
                    >
                      Submit Answer
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Players Progress */}
          <div className="mt-8">
            <h3 className="text-blue-200 font-mono text-sm uppercase tracking-wider mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              Players Progress
            </h3>
            <div className="space-y-3">
              {players.map((player, index) => {
                const isCurrentUser = player.name === name || (player.userId && user?._id && String(player.userId) === String(user._id));
                const playerProgress = questions.length > 0 ? (player.current / questions.length) * 100 : 0;
                const isLeading = player.score === maxScore && maxScore > 0;
                
                return (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${isCurrentUser ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                        <span className={`font-medium ${isCurrentUser ? 'text-blue-300' : 'text-white'}`}>
                          {player.name} {isCurrentUser && '(You)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLeading && (
                          <span className="text-yellow-400 text-xs font-bold bg-yellow-500/20 px-2 py-0.5 rounded-full">
                            🏆 Leading
                          </span>
                        )}
                        <span className="text-blue-300 font-mono">
                          {player.score} pts
                        </span>
                        <span className="text-white/50">•</span>
                        <span className="text-white/70">
                          Q{Math.min(player.current + 1, questions.length)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full rounded-full ${isCurrentUser ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
                        custom={playerProgress}
                        initial="hidden"
                        animate="visible"
                        variants={playerBarVariants}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); }
          50% { transform: translate(10px, 10px) rotate(var(--rotate, 0deg)); }
        }
        @keyframes pulse {
          0% { opacity: 0.1; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(1.05); }
        }
        .glow {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
        }
        .glow-hover:hover {
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.5);
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
