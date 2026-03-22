import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  // 🔐 Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  // 👤 Optional user name (if stored during login)
  const [userName, setUserName] = useState(
    localStorage.getItem("name") || ""
  );

  // 🔄 Sync auth state (same tab + multi tab)
  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
      setUserName(localStorage.getItem("name") || "");
    };

    // multi-tab sync
    window.addEventListener("storage", syncAuth);

    // same-tab sync (IMPORTANT FIX)
    window.addEventListener("authChange", syncAuth);

    // initial sync
    syncAuth();

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("authChange", syncAuth);
    };
  }, []);

  // 🚪 Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");

    // notify all listeners
    window.dispatchEvent(new Event("authChange"));

    setIsLoggedIn(false);
    setUserName("");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      {/* LOGO */}
      <h2
        className="navbar-logo"
        onClick={() =>
          navigate(isLoggedIn ? "/dashboard" : "/login")
        }
        style={{ cursor: "pointer" }}
      >
        Smart Warranty
      </h2>

      <div className="navbar-links">
        {/* 👤 USER INFO */}
        {isLoggedIn && userName && (
          <span className="navbar-user">Hi, {userName}</span>
        )}

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
            <Link to="/add-product" className="nav-link">
              Add Product
            </Link>
            <Link to="/upload-bill" className="nav-link">
              Upload Bill
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