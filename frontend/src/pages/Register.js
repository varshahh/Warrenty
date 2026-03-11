// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://192.168.1.4:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Registration successful! Redirecting to Login...");
        setTimeout(() => navigate("/login"), 1000);
      } else {
        setMessage(data.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Server error. Please try again later.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #667eea, #764ba2)"
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
        <h1 style={{ marginBottom: "25px", color: "#333", fontFamily: "'Poppins', sans-serif" }}>
          Create Account
        </h1>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              marginBottom: "15px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              fontSize: "1rem",
              transition: "all 0.3s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#764ba2"}
            onBlur={(e) => e.target.style.borderColor = "#ccc"}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              marginBottom: "15px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              fontSize: "1rem",
              transition: "all 0.3s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#764ba2"}
            onBlur={(e) => e.target.style.borderColor = "#ccc"}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              marginBottom: "20px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              fontSize: "1rem",
              transition: "all 0.3s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#764ba2"}
            onBlur={(e) => e.target.style.borderColor = "#ccc"}
          />

          <button type="submit" style={{
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s"
          }}
          onMouseEnter={(e)=>{e.target.style.transform="scale(1.05)"; e.target.style.boxShadow="0 6px 20px rgba(0,0,0,0.3)"}}
          onMouseLeave={(e)=>{e.target.style.transform="scale(1)"; e.target.style.boxShadow="none"}}
          >
            Register
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

        <p style={{ marginTop: "15px", fontSize: "0.9rem", color: "#666" }}>
          Already have an account? <span style={{color:"#764ba2", cursor:"pointer"}} onClick={()=>navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Register;