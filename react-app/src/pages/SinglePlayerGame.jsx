// client/src/pages/SinglePlayerGame.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  startSinglePlayer,
  submitSinglePlayerAnswer,
  getSinglePlayerTimer,
} from "../services/singleplayerService";
import { toast } from "react-toastify";

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
        setScore(data.score);
        setAnswer("");
        setCurrent(data.current);
        toast.success("Correct!");
      } else {
        // incorrect: keep on same question, notify user
        toast.error("Wrong answer — try again.");
        setCurrent(data.current); // ensure local index in sync
      }

      if (data.over) setGameOver(true);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <div className="flex justify-between mb-4">
          <span className="text-lg font-semibold text-blue-700">Time: {formatTime(timer)}</span>
          <span className="text-lg font-semibold text-green-700">Score: {score}</span>
        </div>
        <div className="mb-6">
          {gameOver ? (
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Game Over!</h2>
          ) : (
            questions[current] &&
            timer > 0 && (
              <>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">{questions[current]}</h2>
                <form onSubmit={handleSubmit} className="flex gap-2 justify-center">
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
            )
          )}
        </div>
      </div>
    </div>
  );
}
