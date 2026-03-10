// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // for redirecting

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.access_token) {
        // Save token
        localStorage.setItem("token", data.access_token);
        setMessage("Login successful! Redirecting to Dashboard...");
        // Redirect to dashboard after 1 second
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        setMessage(data.message || "Invalid email or password.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Server error. Please try again later.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "20px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "5px" }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "8px" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "8px" }}
        />
        <button type="submit" style={{ padding: "10px", background: "#28a745", color: "#fff", border: "none", borderRadius: "3px" }}>
          Login
        </button>
      </form>
      {message && (
        <p style={{ marginTop: "10px", color: message.includes("successful") ? "green" : "red" }}>{message}</p>
      )}
    </div>
  );
}

export default Login;