import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  // 🔐 Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  // 👤 Optional user name
  const [userName, setUserName] = useState(
    localStorage.getItem("name") || ""
  );

  // 🔄 Sync auth state
  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
      setUserName(localStorage.getItem("name") || "");
    };

    window.addEventListener("storage", syncAuth);
    window.addEventListener("authChange", syncAuth);

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
      >
        📦 Smart Warranty
      </h2>

      <div className="navbar-links">
        
        {/* USER */}
        {isLoggedIn && userName && (
          <span className="navbar-user">
            👋 Hi, {userName}
          </span>
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

            <Link to="/upload-bill" className="nav-link">
              Upload Bill
            </Link>

            <Link to="/profile" className="nav-link">
              Profile
            </Link>

            <button
              onClick={handleLogout}
              className="logout-button"
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