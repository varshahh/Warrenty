import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);

        window.dispatchEvent(new Event("authChange"));

        setMessage("Login successful! Redirecting...");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        setMessage(data.message || "Invalid email or password.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Server error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="page-center">
      <div
        className="glass-card"
        style={{
          width: "400px",
          textAlign: "center"
        }}
      >
        <h1 style={{ marginBottom: "25px" }}>
          Smart Warranty
        </h1>

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column"
          }}
        >
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

          {/* Forgot Password */}
          <div
            style={{
              textAlign: "right",
              marginTop: "-5px",
              marginBottom: "15px",
              fontSize: "0.9rem"
            }}
          >
            <Link
              to="/forgot-password"
              style={{
                color: "#185a9d",
                textDecoration: "none",
                fontWeight: "500"
              }}
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Logging in..." : "Login"}
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

        <p
          style={{
            marginTop: "20px",
            fontSize: "0.9rem"
          }}
        >
          Don't have an account?{" "}
          <span
            style={{
              color: "#185a9d",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>

      </div>
    </div>
  );
}

export default Login;