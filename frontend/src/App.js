// src/App.js
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";

// Components
import Navbar from "./components/Navbar";

// Pages
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadBill from "./pages/UploadBill";
import ProductDetails from "./pages/ProductDetails";
import EditProduct from "./pages/EditProduct";
import AddProduct from "./pages/AddProduct"; // ✅ ADDED


// ---------------- PROTECTED ROUTE ----------------
function ProtectedRoute() {
  const token = localStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

// ---------------- PUBLIC ROUTE ----------------
function PublicRoute() {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  // ✅ Update navbar when login/logout happens
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };

    window.addEventListener("storage", checkAuth);
    window.addEventListener("focus", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("focus", checkAuth);
    };
  }, []);

  return (

    <Router>

      {/* Navbar only when logged in */}
      {isLoggedIn && <Navbar />}

      <Routes>

        {/* ROOT REDIRECT */}
        <Route
          path="/"
          element={
            isLoggedIn
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/login" replace />
          }
        />

        {/* PUBLIC ROUTES */}
        <Route element={<PublicRoute />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/upload-bill" element={<UploadBill />} />

          <Route path="/add-product" element={<AddProduct />} /> {/* ✅ NEW */}

          <Route path="/product/:id" element={<ProductDetails />} />

          <Route path="/edit-product/:id" element={<EditProduct />} />

        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

    </Router>

  );
}

export default App;