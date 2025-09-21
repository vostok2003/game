import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import getSocket from "../socket";
const socket = getSocket();

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
  const winner =
    sortedPlayers.length > 1 &&
    sortedPlayers[0].score !== sortedPlayers[1].score
      ? sortedPlayers[0].name
      : null;

  const handleRematch = () => {
    setRematchLoading(true);
    setWaitingRematch(true);
    socket.emit("rematch", {}, (res) => {
      if (res && res.error) {
        setRematchLoading(false);
        setWaitingRematch(false);
        alert(res.error);
      }
    });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6 text-blue-700">Game Results</h2>
        {winner && (
          <div className="mb-4 text-xl font-bold text-green-700">
            🏆 Winner: {winner}
          </div>
        )}
        <div className="mb-6">
          {sortedPlayers.map((p, i) => (
            <div
              key={i}
              className={`py-2 px-4 bg-gray-100 rounded mb-2 text-lg font-semibold flex justify-between ${
                p.name === name ? "text-blue-700" : "text-gray-700"
              }`}
            >
              <span>
                {p.name} {p.name === name && "(You)"}
              </span>
              <span>{p.score} pts</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <button
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
          <button
            className={`w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition ${
              players.length < 2 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleRematch}
            disabled={players.length < 2 || rematchLoading}
          >
            {rematchLoading ? "Starting..." : "Rematch"}
          </button>
          <button
            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
            onClick={handleShareWhatsApp}
          >
            Share on WhatsApp
          </button>
          {waitingRematch && !otherRequested && (
            <div className="mt-2 text-gray-600">
              Waiting for other player to accept rematch...
            </div>
          )}
          {otherRequested && !rematchLoading && (
            <div className="mt-2 text-green-700 font-bold">
              Other player wants a rematch! Click Rematch to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
