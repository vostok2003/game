// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import WaitingRoom from "./pages/WaitingRoom";
import Game from "./pages/Game";
import Results from "./pages/Results";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SinglePlayerGame from "./pages/SinglePlayerGame";
import AuthSuccess from "./pages/AuthSuccess";
import { UserProvider } from "./context/UserContext";
import DailyHub from "./pages/DailyHub";
import ContestPage from "./pages/ContestPage";
import ContestResults from "./pages/ContestResults";
import api from "./utils/api";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * RequireAuth
 * - If no token => immediate redirect to /login
 * - If token exists and localStorage has user => allow immediately
 * - If token exists but user missing => verify by calling /me and show a small loader while verifying
 */
function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  const localUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  const [loading, setLoading] = React.useState(false);
  const [valid, setValid] = React.useState(() => {
    if (!token) return false;
    // if token exists and user exists, assume valid until proven otherwise
    if (token && localUser) return true;
    return null; // unknown -> verify
  });

  React.useEffect(() => {
    let mounted = true;

    if (!token) {
      setValid(false);
      return;
    }

    if (localUser) {
      setValid(true);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const res = await api.get("/api/me");
        if (!mounted) return;
        if (res?.data?.user) {
          try {
            localStorage.setItem("user", JSON.stringify(res.data.user));
          } catch (e) {}
          setValid(true);
        } else {
          setValid(false);
        }
      } catch (err) {
        setValid(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  if (valid === true) return children;
  if (loading) return <div className="min-h-screen flex items-center justify-center">Checking session…</div>;
  return <Navigate to="/login" />;
}

function LogoutButton() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
    window.location.reload();
  };
  return (
    <button
      className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/success" element={<AuthSuccess />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <LogoutButton />
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/waiting"
        element={
          <RequireAuth>
            <LogoutButton />
            <WaitingRoom />
          </RequireAuth>
        }
      />
      <Route
        path="/game"
        element={
          <RequireAuth>
            <LogoutButton />
            <Game />
          </RequireAuth>
        }
      />
      <Route
        path="/results"
        element={
          <RequireAuth>
            <LogoutButton />
            <Results />
          </RequireAuth>
        }
      />
      <Route
        path="/singleplayer"
        element={
          <RequireAuth>
            <LogoutButton />
            <SinglePlayerGame />
          </RequireAuth>
        }
      />
      <Route
        path="/daily"
        element={
          <RequireAuth>
            <LogoutButton />
            <DailyHub />
          </RequireAuth>
        }
      />
      <Route
        path="/contest/:contestId"
        element={
          <RequireAuth>
            <ContestPage />
          </RequireAuth>
        }
      />
      <Route
        path="/contest/:contestId/results"
        element={
          <RequireAuth>
            <ContestResults />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Router>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </UserProvider>
  );
}
