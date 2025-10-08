// client/src/pages/SinglePlayerGame.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  startSinglePlayer,
  submitSinglePlayerAnswer,
  getSinglePlayerTimer,
} from "../services/singlePlayerService";
import { toast } from "react-toastify";

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

const scoreVariants = {
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};

export default function SinglePlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const pickedMode = location.state?.mode || 1;

  const [sessionId, setSessionId] = useState(() => localStorage.getItem("singlePlayerSessionId"));
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem("singlePlayerQuestions");
    return saved ? JSON.parse(saved) : [];
  });
  const [current, setCurrent] = useState(() => {
    const saved = localStorage.getItem("singlePlayerCurrent");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [score, setScore] = useState(() => {
    const saved = localStorage.getItem("singlePlayerScore");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [timer, setTimer] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showIncorrect, setShowIncorrect] = useState(false);
  const [symbols] = useState(() => generateSymbols(25));
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const timerInterval = useRef();

  useEffect(() => {
    setLoading(true);
    let mounted = true;

    const resumeOrStart = async () => {
      if (sessionId) {
        try {
          const { timeLeft, over } = await getSinglePlayerTimer(sessionId);
          if (!mounted) return;
          setTimer(timeLeft);
          if (over) setGameOver(true);
          setLoading(false);
        } catch (err) {
          // session might be invalid — start fresh
          console.error("getSinglePlayerTimer failed, starting new session", err);
          const data = await startSinglePlayer(pickedMode);
          if (!mounted) return;
          setSessionId(data.sessionId);
          setQuestions(data.questions);
          setCurrent(0);
          setScore(0);
          setGameOver(false);
          setAnswer("");
          setTimer(data.timerDuration);
          try {
            localStorage.setItem("singlePlayerSessionId", data.sessionId);
            localStorage.setItem("singlePlayerQuestions", JSON.stringify(data.questions));
            localStorage.setItem("singlePlayerCurrent", "0");
            localStorage.setItem("singlePlayerScore", "0");
          } catch {}
          setLoading(false);
        }
      } else {
        const data = await startSinglePlayer(pickedMode);
        if (!mounted) return;
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setCurrent(0);
        setScore(0);
        setGameOver(false);
        setAnswer("");
        setTimer(data.timerDuration);
        try {
          localStorage.setItem("singlePlayerSessionId", data.sessionId);
          localStorage.setItem("singlePlayerQuestions", JSON.stringify(data.questions));
          localStorage.setItem("singlePlayerCurrent", "0");
          localStorage.setItem("singlePlayerScore", "0");
        } catch {}
        setLoading(false);
      }
    };

    resumeOrStart().catch((err) => {
      console.error(err);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line
  }, [pickedMode]);

  useEffect(() => {
    if (!sessionId) return;
    timerInterval.current = setInterval(async () => {
      try {
        const { timeLeft, over } = await getSinglePlayerTimer(sessionId);
        setTimer(timeLeft);
        if (over || timeLeft <= 0) {
          setGameOver(true);
          clearInterval(timerInterval.current);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);
    return () => clearInterval(timerInterval.current);
  }, [sessionId]);

  useEffect(() => {
    if (current >= questions.length && questions.length > 0) {
      setGameOver(true);
      localStorage.removeItem("singlePlayerSessionId");
      localStorage.removeItem("singlePlayerQuestions");
      localStorage.removeItem("singlePlayerCurrent");
      localStorage.removeItem("singlePlayerScore");
    }
  }, [current, questions.length]);

  useEffect(() => {
    try {
      localStorage.setItem("singlePlayerCurrent", String(current));
    } catch {}
  }, [current]);

  useEffect(() => {
    try {
      localStorage.setItem("singlePlayerScore", String(score));
    } catch {}
  }, [score]);

  useEffect(() => {
    if (gameOver) {
      setTimeout(() => {
        try {
          localStorage.removeItem("singlePlayerSessionId");
          localStorage.removeItem("singlePlayerQuestions");
          localStorage.removeItem("singlePlayerCurrent");
          localStorage.removeItem("singlePlayerScore");
        } catch {}
        navigate("/results", {
          state: { players: [{ name: "You", score }], score },
        });
      }, 1000);
    }
  }, [gameOver, navigate, score]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (gameOver || !sessionId) return;

    if (String(answer).trim() === "") {
      toast.error("Enter an answer before submitting.");
      return;
    }

    try {
      const data = await submitSinglePlayerAnswer(sessionId, Number(answer));
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.correct) {
        setShowCorrect(true);
        setTimeout(() => setShowCorrect(false), 1000);
        setScore(data.score);
        setAnswer("");
        // Small delay before moving to next question for better UX
        setTimeout(() => {
          setCurrent(data.current);
        }, 500);
      } else {
        setShowIncorrect(true);
        setTimeout(() => setShowIncorrect(false), 1000);
        setCurrent(data.current); // ensure local index in sync
      }

      if (data.over) {
        setTimeout(() => setGameOver(true), 1000);
      }
    } catch (err) {
      console.error(err);
      toast.error("Submit failed");
    }
  };

  const formatTime = (s) => {
    if (s == null) return "--:--";
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (loading || !questions.length || timer == null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
        {/* Animated Background Elements */}
        {symbols.map((sym) => (
          <motion.span
            key={sym.id}
            className="absolute text-white/10 pointer-events-none"
            style={{
              left: `${sym.left}%`,
              top: `${sym.top}%`,
              fontSize: `${sym.size}rem`,
              opacity: sym.opacity,
              transform: `rotate(${sym.rotate}deg)`
            }}
            animate={{
              y: [0, -20, 0],
              rotate: sym.rotate + 360
            }}
            transition={{
              duration: sym.animationDuration,
              delay: sym.animationDelay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {sym.symbol}
          </motion.span>
        ))}
        
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/10 w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-6">
            <motion.div
              className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Preparing Your Challenge</h2>
          <p className="text-gray-400">Loading mathematical problems...</p>
          <motion.div 
            className="mt-6 h-1 bg-gray-700 rounded-full overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          >
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden p-4"
    >
      {/* Animated Background Elements */}
      {symbols.map((sym) => (
        <motion.span
          key={sym.id}
          className="absolute text-white/10 pointer-events-none"
          style={{
            left: `${sym.left}%`,
            top: `${sym.top}%`,
            fontSize: `${sym.size}rem`,
            opacity: sym.opacity,
            transform: `rotate(${sym.rotate}deg)`
          }}
          animate={{
            y: [0, -20, 0],
            rotate: sym.rotate + 360
          }}
          transition={{
            duration: sym.animationDuration,
            delay: sym.animationDelay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {sym.symbol}
        </motion.span>
      ))}

      {/* Gradient Mesh Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-purple-500/5" />
      </div>

      {/* Main Content */}
      <motion.div 
        className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/10 w-full max-w-md relative z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <motion.div 
            className="text-lg font-semibold text-blue-400 bg-gray-900/50 px-4 py-2 rounded-lg"
            animate={timer < 10 && !gameOver ? {
              scale: [1, 1.05, 1],
              backgroundColor: ["#1e3a8a", "#1e40af", "#1e3a8a"],
              transition: {
                duration: 1,
                repeat: Infinity
              }
            } : {}}
          >
            ⏱️ {formatTime(timer)}
          </motion.div>
          
          <motion.div 
            className="text-lg font-semibold text-green-400 bg-gray-900/50 px-4 py-2 rounded-lg"
            variants={scoreVariants}
            animate="pulse"
          >
            🏆 {score} Points
          </motion.div>
        </div>

        {/* Question Area */}
        <div className="mb-8">
          <AnimatePresence mode="wait">
            {gameOver ? (
              <motion.div
                key="game-over"
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl font-bold text-white mb-4">Challenge Complete!</h2>
                <p className="text-xl text-gray-300 mb-6">Your score: <span className="text-yellow-400 font-bold">{score}</span></p>
                <motion.button
                  onClick={() => navigate("/")}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity w-full"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Return to Home
                </motion.button>
              </motion.div>
            ) : (
              questions[current] &&
              timer > 0 && (
                <motion.div
                  key={`question-${current}`}
                  variants={questionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-20"></div>
                    <div className="relative bg-gray-900/50 p-6 rounded-lg">
                      <h2 className="text-2xl font-bold text-white text-center">
                        {questions[current]}
                      </h2>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <motion.div 
                      className="relative"
                      animate={showCorrect ? { 
                        x: [0, -5, 5, -5, 0],
                        backgroundColor: ["#1f2937", "#10b981", "#1f2937"],
                        transition: { duration: 0.5 }
                      } : showIncorrect ? {
                        x: [0, -5, 5, -5, 0],
                        backgroundColor: ["#1f2937", "#ef4444", "#1f2937"],
                        transition: { duration: 0.5 }
                      } : {}}
                    >
                      <input
                        ref={inputRef}
                        type="number"
                        className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg text-white text-center text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Your answer"
                        autoFocus
                        disabled={gameOver}
                      />
                      <AnimatePresence>
                        {showCorrect && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                          >
                            <span className="text-4xl">✓</span>
                          </motion.div>
                        )}
                        {showIncorrect && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                          >
                            <span className="text-4xl">✗</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={gameOver}
                    >
                      Submit Answer
                    </motion.button>
                  </form>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700/50 rounded-full h-2.5 mb-6 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full"
            initial={{ width: "0%" }}
            animate={{ 
              width: `${((current + 1) / questions.length) * 100}%`,
              transition: { duration: 0.5 }
            }}
          />
        </div>

        {/* Progress Text */}
        <div className="text-center text-sm text-gray-400">
          Question {current + 1} of {questions.length}
        </div>
      </motion.div>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
