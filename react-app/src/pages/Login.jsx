// client/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, saveToken, saveUser } from "../services/authService";
import { FcGoogle } from "react-icons/fc";
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login({ email, password });
      if (data?.token) {
        saveToken(data.token);
        saveUser(data.user);
      }
      navigate("/");
      // reload so socket picks up token
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // redirect to backend route that starts OAuth
    window.location.href = `${BACKEND_ORIGIN}/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <form
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-bold mb-6 text-blue-700">Login</h2>
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full mb-4 bg-white border py-2 rounded flex items-center justify-center gap-3 hover:shadow"
          >
            <FcGoogle />
            Sign in with Google
          </button>
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <div className="mt-4 text-center">
          <span>Don't have an account? </span>
          <button
            type="button"
            className="text-blue-600 underline"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}
