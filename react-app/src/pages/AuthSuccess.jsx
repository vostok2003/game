// client/src/pages/AuthSuccess.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken, saveUser } from "../services/authService";

export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // store token for sockets / api
    saveToken(token);

    // fetch user info from backend
    const fetchUser = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${base}/api/me`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          credentials: 'include',
        });

        // Read text first to avoid JSON.parse crash on HTML
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          console.error("AuthSuccess /me returned non-JSON:", text);
          navigate("/login");
          return;
        }

        if (data?.user) {
          saveUser(data.user);
          // reload to ensure socket picks up new token from localStorage
          window.location.replace("/");
        } else {
          navigate("/login");
        }
      } catch (err) {
        console.error("AuthSuccess fetch /api/me error", err);
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate]);

  return <div className="min-h-screen flex items-center justify-center">Signing you in…</div>;
}
