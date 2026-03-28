import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://127.0.0.1:5000"}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Registration successful! Redirecting to Login...");

        setTimeout(() => {
          navigate("/login");
        }, 1200);
      } else {
        setMessage(data.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Server error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="page-center">
      <div className="glass-card" style={{ width: "400px", textAlign: "center" }}>
        
        <h1 style={{ marginBottom: "25px" }}>
          Create Account
        </h1>

        <form
          onSubmit={handleRegister}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <input
            type="text"
            placeholder="Name"
            value={name}
            required
            disabled={loading}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "15px",
              color: message.includes("successful")
                ? "#22c55e"
                : "#ef4444",
              fontWeight: "bold"
            }}
          >
            {message}
          </p>
        )}

        <p style={{ marginTop: "15px", fontSize: "0.9rem" }}>
          Already have an account?{" "}
          <span
            style={{
              color: "#185a9d",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}

export default Register;