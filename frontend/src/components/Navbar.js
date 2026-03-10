// src/components/Navbar.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token"); // check login

  const handleLogout = () => {
    localStorage.removeItem("token"); // remove JWT token
    navigate("/login"); // go to login
  };

  return (
    <nav style={{ padding: "10px", background: "#f0f0f0", marginBottom: "20px" }}>
      {/* SPA links must use Link */}
      <Link to="/" style={{ marginRight: "10px" }}>Register</Link>
      <Link to="/login" style={{ marginRight: "10px" }}>Login</Link>

      {/* Only show these if logged in */}
      {token && (
        <>
          <Link to="/dashboard" style={{ marginRight: "10px" }}>Dashboard</Link>
          <Link to="/add-product" style={{ marginRight: "10px" }}>Add Product</Link>
          <Link to="/upload-bill" style={{ marginRight: "10px" }}>Upload Bill</Link>
          <button onClick={handleLogout} style={{ marginLeft: "10px" }}>Logout</button>
        </>
      )}
    </nav>
  );
}

export default Navbar;