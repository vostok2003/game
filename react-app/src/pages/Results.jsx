import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import getSocket from "../socket";
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
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  }
};

const winnerVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      delay: 0.2
    }
  }
};

const buttonVariants = {
  hover: { 
    scale: 1.03,
    boxShadow: "0 0 15px rgba(99, 102, 241, 0.5)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: { 
    scale: 0.98,
    boxShadow: "0 0 5px rgba(99, 102, 241, 0.3)"
  }
};

export default function Results() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const name = user?.name || "";
  const players = state?.players || [];
  const score = state?.score;
  const roomCode = state?.roomCode;
  const isHost = state?.isHost;
  const [rematchLoading, setRematchLoading] = useState(false);
  const [waitingRematch, setWaitingRematch] = useState(false);
  const [otherRequested, setOtherRequested] = useState(false);
  const [symbols] = useState(() => generateSymbols(25));
  const containerRef = useRef(null);

  useEffect(() => {
    function handleRematchStarted({ questions, mode, players }) {
      setRematchLoading(false);
      setWaitingRematch(false);
      setOtherRequested(false);
      // Save new game state
      localStorage.setItem(
        "gameState",
        JSON.stringify({ roomCode, players, questions, mode })
      );
      navigate("/game", {
        state: { roomCode, players, questions, mode },
      });
    }
    function handleRematchRequested({ name }) {
      setOtherRequested(true);
      setWaitingRematch(false);
    }
    socket.on("rematchStarted", handleRematchStarted);
    socket.on("rematchRequested", handleRematchRequested);
    return () => {
      socket.off("rematchStarted", handleRematchStarted);
      socket.off("rematchRequested", handleRematchRequested);
      setWaitingRematch(false);
      setOtherRequested(false);
    };
  }, [navigate, roomCode]);

  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers.length > 0 ? sortedPlayers[0] : null;
  const isTie = sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;
  const maxScore = winner ? winner.score : 0;

  const handleRematch = () => {
  setRematchLoading(true);
  setWaitingRematch(true);

  socket.emit(
    "rematch",
    { name }, // 👈 IMPORTANT: explicitly send name
    (res) => {
      if (res && res.error) {
        setRematchLoading(false);
        setWaitingRematch(false);
        alert(res.error);
      }
    }
  );
};


  // Add WhatsApp share logic (beautiful text card)
  const getShareMessage = () => {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner =
      sorted.length > 1 && sorted[0].score !== sorted[1].score
        ? sorted[0].name
        : null;
    let msg = `🏆 *Math Game Results!* 🏆%0A`;
    if (winner) {
      msg += `*Winner: ${winner}*%0A`;
    }
    msg += `%0A*Players:*%0A`;
    sorted.forEach((p, i) => {
      msg += `${i + 1}. *${p.name}* — ${p.score} pts | Solved: ${
        typeof p.current === "number" ? p.current : 0
      }%0A`;
    });
    msg += `%0APlay now and challenge your friends!`;
    return msg;
  };

  const handleShareWhatsApp = () => {
    const msg = getShareMessage();
    const url = `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

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
      <div className="relative z-10 w-full max-w-2xl mx-4">
        <motion.div 
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl overflow-hidden"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-400/30 rounded-br-lg"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-400/30 rounded-bl-lg"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-400/30 rounded-tr-lg"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-400/30 rounded-tl-lg"></div>
          
          {/* Header */}
          <motion.div 
            className="text-center mb-8"
            variants={itemVariants}
          >
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">🏆</span>
            </div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 mb-2">
              Game Results
            </h2>
            {winner && !isTie && (
              <motion.div 
                className="text-xl font-bold text-yellow-300 mt-2"
                variants={winnerVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="inline-flex items-center bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-4 py-1 rounded-full border border-yellow-400/30">
                  <span className="mr-2">👑</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-amber-200">
                    {winner.name === name ? 'You Won!' : `Winner: ${winner.name}`}
                  </span>
                </div>
              </motion.div>
            )}
            {isTie && (
              <motion.div 
                className="text-xl font-bold text-blue-300 mt-2"
                variants={winnerVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-1 rounded-full border border-blue-400/30">
                  <span className="mr-2">🤝</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                    It's a Tie!
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
          
          {/* Players List */}
          <motion.div 
            className="mb-8 space-y-3"
            variants={containerVariants}
          >
            {sortedPlayers.map((player, index) => {
              const isCurrentUser = player.name === name || (player.userId && user?._id && String(player.userId) === String(user._id));
              const scorePercentage = maxScore > 0 ? (player.score / maxScore) * 100 : 0;
              
              return (
                <motion.div 
                  key={index}
                  className="relative group"
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index * 0.1}
                >
                  <div className={`flex items-center justify-between p-4 rounded-xl ${
                    isCurrentUser 
                      ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20' 
                      : 'bg-white/5 border border-white/5 hover:border-blue-500/30'
                  } transition-all duration-300`}>
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                        index === 0 && !isTie 
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/20' 
                          : 'bg-gradient-to-br from-blue-500 to-purple-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {player.name} {isCurrentUser && <span className="text-blue-300 text-sm">(You)</span>}
                        </div>
                        <div className="text-xs text-blue-300">
                          {player.current || 0} questions solved
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">{player.score}</div>
                      <div className="text-xs text-blue-300">points</div>
                    </div>
                    
                    {/* Badge for winner */}
                    {index === 0 && !isTie && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center">
                        <span className="mr-1">🏆</span> Winner
                      </div>
                    )}
                  </div>
                  
                  {/* Score Bar */}
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <motion.div 
                      className={`h-full ${
                        index === 0 && !isTie 
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${scorePercentage}%` }}
                      transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
          
          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col gap-3"
            variants={containerVariants}
          >
            <motion.button
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              onClick={() => navigate("/")}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <span>←</span>
              Back to Home
            </motion.button>
            
            <motion.button
              className={`w-full py-3 px-6 font-bold rounded-xl text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                players.length < 2 || rematchLoading
                  ? 'bg-gray-600/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg'
              }`}
              onClick={handleRematch}
              disabled={players.length < 2 || rematchLoading}
              variants={buttonVariants}
              whileHover={players.length >= 2 && !rematchLoading ? "hover" : {}}
              whileTap={players.length >= 2 && !rematchLoading ? "tap" : {}}
            >
              {rematchLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Rematch
                </>
              )}
            </motion.button>
            
            <motion.button
              className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              onClick={handleShareWhatsApp}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <span>📱</span>
              Share on WhatsApp
            </motion.button>
            
            <AnimatePresence>
              {waitingRematch && !otherRequested && (
                <motion.div 
                  className="mt-2 text-blue-300 text-sm flex items-center justify-center gap-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <svg className="animate-ping h-2 w-2 text-blue-400" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  Waiting for other player to accept rematch...
                </motion.div>
              )}
              
              {otherRequested && !rematchLoading && (
                <motion.div 
                  className="mt-2 text-green-300 text-sm font-medium bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <span>✨</span>
                  Other player wants a rematch! Click Rematch to start.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
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
      `}</style>
    </div>
  );
}