// src/pages/UploadBill.js
import React, { useState } from "react";

function UploadBill() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first!");
      return;
    }

    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("bill", file);

    try {
      const res = await fetch("http://127.0.0.1:5000/upload_bill", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Bill uploaded successfully!");
        setFile(null);
      } else {
        setMessage(data.message || "Failed to upload bill.");
      }
    } catch (error) {
      console.error("Upload bill error:", error);
      setMessage("Server error. Please try again later.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "20px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "5px" }}>
      <h2>Upload Bill</h2>
      <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column" }}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginBottom: "10px" }}
          required
        />
        <button
          type="submit"
          style={{ padding: "10px", background: "#28a745", color: "#fff", border: "none", borderRadius: "3px" }}
        >
          Upload
        </button>
      </form>
      {message && (
        <p style={{ marginTop: "10px", color: message.includes("successfully") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default UploadBill;