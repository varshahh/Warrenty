import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  // Track token state to re-render Navbar dynamically
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Listen to storage changes (if user logs in/out in another tab)
  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null); 
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <h2
        className="navbar-logo"
        onClick={() => navigate("/dashboard")}
        style={{ cursor: "pointer" }}
      >
        Smart Warranty
      </h2>

      <div className="navbar-links">
        {!token ? (
          <>
            <Link to="/register" className="nav-link">Register</Link>
            <Link to="/login" className="nav-link">Login</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/upload-bill" className="nav-link">Upload Bill</Link>
            <button onClick={handleLogout} className="nav-button">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;