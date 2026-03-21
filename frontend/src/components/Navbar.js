// src/components/Navbar.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {

  const navigate = useNavigate();

  // ✅ Track auth state properly
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  // ✅ Sync across tabs + internal updates
  useEffect(() => {

    const syncAuth = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };

    // listen for changes from other tabs
    window.addEventListener("storage", syncAuth);

    // also check when component mounts (important fix)
    syncAuth();

    return () => window.removeEventListener("storage", syncAuth);

  }, []);

  // ✅ Logout
  const handleLogout = () => {

    localStorage.removeItem("token");

    // force state update
    setIsLoggedIn(false);

    // redirect
    navigate("/login");

  };

  return (

    <nav className="navbar">

      {/* LOGO */}
      <h2
        className="navbar-logo"
        onClick={() => navigate(isLoggedIn ? "/dashboard" : "/login")}
        style={{ cursor: "pointer" }}
      >
        Smart Warranty
      </h2>

      <div className="navbar-links">

        {!isLoggedIn ? (

          <>
            <Link to="/register" className="nav-link">
              Register
            </Link>

            <Link to="/login" className="nav-link">
              Login
            </Link>
          </>

        ) : (

          <>
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>

            <Link to="/upload-bill" className="nav-link">
              Add Product
            </Link>

            <button onClick={handleLogout} className="nav-button">
              Logout
            </button>
          </>

        )}

      </div>

    </nav>

  );

}

export default Navbar;