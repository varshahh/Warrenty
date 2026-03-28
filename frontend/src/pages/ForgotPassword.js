import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:5000";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Password updated successfully!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Server error");
    }
  };

  return (
    <div className="page-center">
      <div className="glass-card" style={{ width: "400px" }}>
        <h2>Forgot Password</h2>
        {message && <p style={{ color: message.includes("success") ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>{message}</p>}
        <input type="email" placeholder="Enter Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <button className="btn-primary" onClick={handleReset}>Reset Password</button>
      </div>
    </div>
  );
}

export default ForgotPassword;