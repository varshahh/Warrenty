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

// 🔥 Import Global CSS
import "./App.css";


// ---------------- 404 PAGE ----------------
function NotFound() {
  return (
    <div className="page-center">
      <div className="glass-card">
        <h1>404</h1>
        <p>Page Not Found</p>
      </div>
    </div>
  );
}

// ---------------- TOKEN HELPER ----------------
const getToken = () => localStorage.getItem("token");

// ---------------- PROTECTED ROUTE ----------------
function ProtectedRoute() {
  return getToken() ? <Outlet /> : <Navigate to="/login" replace />;
}

// ---------------- PUBLIC ROUTE ----------------
function PublicRoute() {
  return getToken() ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());

  // 🔥 Fully reactive auth sync (Navbar + Login compatible)
  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(!!getToken());
    };

    window.addEventListener("storage", syncAuth);
    window.addEventListener("focus", syncAuth);
    window.addEventListener("authChange", syncAuth);

    syncAuth();

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
      window.removeEventListener("authChange", syncAuth);
    };
  }, []);

  return (
    <Router>
      {/* 🌊 Global Gradient Wrapper */}
      <div className="app-theme">

        {/* Navbar only when logged in */}
        {isLoggedIn && <Navbar />}

        <Routes>
          {/* ROOT REDIRECT */}
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
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
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/edit-product/:id" element={<EditProduct />} />
          </Route>

          {/* 404 PAGE */}
          <Route path="*" element={<NotFound />} />
        </Routes>

      </div>
    </Router>
  );
}

export default App;