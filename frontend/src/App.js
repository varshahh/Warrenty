// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Components
import Navbar from "./components/Navbar";

// Pages
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadBill from "./pages/UploadBill";
import ProductDetails from "./pages/ProductDetails";
import EditProduct from "./pages/EditProduct";

// 🔒 Protected Route
function ProtectedRoute() {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />; // Render nested routes
}

// 🔓 Public Route
function PublicRoute() {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/dashboard" replace />;
  return <Outlet />; // Render nested routes
}

function App() {
  const token = localStorage.getItem("token");

  return (
    <Router>
      {/* Show Navbar only when logged in */}
      {token && <Navbar />}

      <Routes>
        {/* Default route */}
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload-bill" element={<UploadBill />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;