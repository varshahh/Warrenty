import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function Profile() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---------------- FETCH PROFILE ----------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    fetch(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setName(data.name || "");
        setEmail(data.email || "");
      })
      .catch(() => setMessage("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [navigate]);

  // ---------------- SUBMIT ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (newPassword && newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }

    const token = localStorage.getItem("token");
    setSaving(true);

    try {
      const res = await fetch(`${BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        localStorage.setItem("name", data.name);
        window.dispatchEvent(new Event("authChange"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage("Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <h2 style={loadingStyle}>Loading Profile...</h2>;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={avatarStyle}>
          {name ? name.charAt(0).toUpperCase() : "?"}
        </div>

        <h2 style={titleStyle}>My Profile</h2>
        <p style={emailStyle}>{email}</p>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>

          {/* Name */}
          <label style={labelStyle}>Full Name</label>
          <div style={inputGroup}>
            <span style={iconStyle}>👤</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <hr style={dividerStyle} />
          <p style={sectionLabel}>Change Password <span style={optionalStyle}>(optional)</span></p>

          {/* Current Password */}
          <label style={labelStyle}>Current Password</label>
          <div style={inputGroup}>
            <span style={iconStyle}>🔒</span>
            <input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* New Password */}
          <label style={labelStyle}>New Password</label>
          <div style={inputGroup}>
            <span style={iconStyle}>🔑</span>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Confirm Password */}
          <label style={labelStyle}>Confirm New Password</label>
          <div style={inputGroup}>
            <span style={iconStyle}>🔑</span>
            <input
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {message && (
          <p style={messageStyle(message)}>{message}</p>
        )}
      </div>
    </div>
  );
}

// ---------------- STYLES ----------------
const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px"
};

const cardStyle = {
  width: "100%",
  maxWidth: "440px",
  padding: "35px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.15)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "white",
  textAlign: "center"
};

const avatarStyle = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  background: "linear-gradient(135deg,#6a11cb,#2575fc)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  fontWeight: "bold",
  color: "white",
  margin: "0 auto 14px"
};

const titleStyle = {
  fontSize: "22px",
  fontWeight: "600",
  marginBottom: "4px",
  color: "white"
};

const emailStyle = {
  fontSize: "0.85rem",
  color: "rgba(255,255,255,0.7)",
  marginBottom: "20px"
};

const dividerStyle = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.2)",
  margin: "18px 0 14px"
};

const sectionLabel = {
  textAlign: "left",
  fontSize: "14px",
  fontWeight: "600",
  marginBottom: "12px",
  color: "rgba(255,255,255,0.9)"
};

const optionalStyle = {
  fontWeight: "400",
  fontSize: "12px",
  color: "rgba(255,255,255,0.55)"
};

const labelStyle = {
  display: "block",
  textAlign: "left",
  fontSize: "12px",
  color: "rgba(255,255,255,0.7)",
  marginBottom: "2px"
};

const inputGroup = {
  position: "relative",
  marginBottom: "14px"
};

const iconStyle = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "14px"
};

const inputStyle = {
  width: "100%",
  padding: "11px 12px 11px 36px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.2)",
  border: "1px solid rgba(255,255,255,0.3)",
  color: "white",
  outline: "none",
  fontSize: "14px"
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg,#6a11cb,#2575fc)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "6px",
  fontSize: "15px"
};

const messageStyle = (msg) => ({
  marginTop: "14px",
  fontWeight: "bold",
  color: msg.toLowerCase().includes("success") ? "#90ee90" : "#ffb3b3"
});

const loadingStyle = {
  textAlign: "center",
  marginTop: "80px",
  color: "white"
};

export default Profile;
