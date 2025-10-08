import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

export default function WaitingRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const name = user?.name || "";
  const { roomCode, players: initialPlayers, isHost } = location.state || {};
  const [players, setPlayers] = useState(initialPlayers || []);
  const [symbols] = useState(() => generateSymbols(25));
  const [countdown, setCountdown] = useState(3);
  const [isStarting, setIsStarting] = useState(false);
  const bothPresent = players.length === 2;
  const containerRef = useRef(null);
  const pulseInterval = useRef(null);

  useEffect(() => {
    function handleRoomUpdate(newPlayers) {
      setPlayers(newPlayers);
    }
    function handleGameStarted({ questions, mode }) {
      // Start countdown animation
      setIsStarting(true);
      let counter = 3;
      setCountdown(counter);
      
      const countdownInterval = setInterval(() => {
        counter--;
        setCountdown(counter);
        if (counter <= 0) {
          clearInterval(countdownInterval);
          navigate("/game", {
            state: { roomCode, players, questions, mode },
          });
        }
      }, 1000);

      return () => clearInterval(countdownInterval);
    }

    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameStarted", handleGameStarted);

    // Add pulsing effect to the start button when both players are present
    if (bothPresent && isHost) {
      pulseInterval.current = setInterval(() => {
        const button = document.querySelector('.start-button');
        if (button) {
          button.classList.toggle('animate-pulse');
        }
      }, 1500);
    }

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("gameStarted", handleGameStarted);
      if (pulseInterval.current) {
        clearInterval(pulseInterval.current);
      }
    };
  }, [navigate, players, roomCode, bothPresent, isHost]);

  const handleStart = () => {
    if (bothPresent) {
      socket.emit("startGame");
    }
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
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">⏳</span>
              </div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300">
                Waiting Room
              </h2>
            </div>
            
            <div className="text-blue-300 font-mono text-sm bg-blue-900/30 inline-block px-3 py-1 rounded-full border border-blue-500/30">
              Room Code: <span className="text-white font-bold">{roomCode}</span>
            </div>
          </div>

          {/* Players List */}
          <div className="mb-8">
            <h3 className="text-blue-200 font-mono text-sm uppercase tracking-wider mb-4">
              Players Joined: {players.length}/2
            </h3>
            <div className="space-y-3">
              {players.map((player, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">{player.name}</div>
                    <div className="text-xs text-blue-300">Ready to play</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </motion.div>
              ))}
              
              {players.length < 2 && (
                <motion.div 
                  className="p-4 rounded-xl border-2 border-dashed border-white/10 text-center text-blue-300/50"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
                >
                  {players.length === 0 ? 'No players joined yet' : 'Waiting for opponent...'}
                </motion.div>
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-blue-300 text-sm font-mono">
                {players.length < 2 
                  ? 'Waiting for opponent to join...' 
                  : 'Ready to start the game!'}
              </span>
            </div>
          </div>

          {/* Start Game Button */}
          {isHost && (
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                className={`start-button w-full max-w-xs py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                  bothPresent
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!bothPresent}
                onClick={handleStart}
              >
                {bothPresent ? 'Start Game' : 'Waiting for opponent...'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {isStarting && (
          <motion.div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-white text-9xl font-bold"
            >
              {countdown > 0 ? countdown : 'Go!'}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
