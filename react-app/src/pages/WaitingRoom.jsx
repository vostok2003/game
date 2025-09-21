import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import getSocket from "../socket";
const socket = getSocket();

export default function WaitingRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const name = user?.name || "";
  const { roomCode, players: initialPlayers, isHost } = location.state || {};
  const [players, setPlayers] = useState(initialPlayers || []);
  const bothPresent = players.length === 2;

  useEffect(() => {
    function handleRoomUpdate(newPlayers) {
      setPlayers(newPlayers);
    }
    function handleGameStarted({ questions, mode }) {
      navigate("/game", {
        state: { roomCode, players, questions, mode },
      });
    }
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameStarted", handleGameStarted);
    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("gameStarted", handleGameStarted);
    };
  }, [navigate, players, roomCode]);

  const handleStart = () => {
    socket.emit("startGame");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-200 to-blue-200">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-purple-700">
          Waiting Room
        </h2>
        <div className="mb-2 text-gray-500">
          Room Code: <span className="font-mono">{roomCode}</span>
        </div>
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            {players.map((p, i) => (
              <div
                key={i}
                className="py-2 px-4 bg-gray-100 rounded text-lg font-semibold text-gray-700"
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>
        <p className="mb-6 text-gray-600">
          Waiting for both players to join...
        </p>
        {isHost && (
          <button
            className={`w-full py-2 rounded text-white font-bold ${
              bothPresent
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!bothPresent}
            onClick={handleStart}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
