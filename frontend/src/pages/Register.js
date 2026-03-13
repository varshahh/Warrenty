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
      const res = await fetch("http://127.0.0.1:5000/register", {
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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg,#667eea,#764ba2)"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "40px",
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        textAlign: "center"
      }}>
        <h1 style={{ marginBottom: "25px", color: "#333" }}>Create Account</h1>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            required
            disabled={loading}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "15px", padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: "15px", padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginBottom: "20px", padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              color: "#fff",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: "15px",
            color: message.includes("successful") ? "#28a745" : "#dc3545",
            fontWeight: "bold"
          }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: "15px", fontSize: "0.9rem" }}>
          Already have an account?{" "}
          <span
            style={{ color: "#764ba2", cursor: "pointer", fontWeight: "bold" }}
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