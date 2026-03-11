// src/components/Navbar.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const linkStyle = {
    textDecoration: "none",
    color: "white",
    fontWeight: "500",
    padding: "8px 12px",
    borderRadius: "6px",
    transition: "0.3s"
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px 40px",
        background: "linear-gradient(90deg,#4facfe,#00f2fe)",
        boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
        marginBottom: "30px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      
      {/* Logo / Title */}
      <h2
        style={{
          color: "white",
          margin: 0,
          fontWeight: "bold",
          letterSpacing: "1px"
        }}
      >
        Smart Warranty
      </h2>

      {/* Navigation Links */}
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        
        <Link to="/" style={linkStyle}>
          Register
        </Link>

        <Link to="/login" style={linkStyle}>
          Login
        </Link>

        {token && (
          <>
            <Link to="/dashboard" style={linkStyle}>
              Dashboard
            </Link>

            <Link to="/upload-bill" style={linkStyle}>
              Upload Bill
            </Link>

            <button
              onClick={handleLogout}
              style={{
                background: "#ff4d4d",
                border: "none",
                color: "white",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                transition: "0.3s"
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;