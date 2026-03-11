// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

// Import all pages
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadBill from "./pages/UploadBill";
import ProductDetails from "./pages/ProductDetails";

function App() {
  return (
    <Router>
      <Navbar /> {/* Navbar always visible */}

      <Routes>
        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Register />} />

        {/* Main app */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload-bill" element={<UploadBill />} />
        <Route path="/product/:id" element={<ProductDetails />} />
      </Routes>
    </Router>
  );
}

export default App;