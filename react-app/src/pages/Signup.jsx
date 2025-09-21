// src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup, saveToken, saveUser } from "../services/authService";

export default function Signup() {
  const [name, setName] = useState("");
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
      const data = await signup({ name, email, password });
      if (data?.token) {
        saveToken(data.token);
        saveUser(data.user);
      }
      navigate("/");
      // reload so socket picks up token
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
      <form
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-bold mb-6 text-purple-700">Sign Up</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
        <div className="mt-4 text-center">
          <span>Already have an account? </span>
          <button
            type="button"
            className="text-purple-600 underline"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
}
