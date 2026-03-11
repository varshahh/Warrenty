// src/pages/UploadBill.js
import React, { useState } from "react";

function UploadBill() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);

    if (selectedFile) {
      const previewURL = URL.createObjectURL(selectedFile);
      setPreview(previewURL);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first!");
      return;
    }

    if (!file) {
      setMessage("Please select a bill image.");
      return;
    }

    const formData = new FormData();
    formData.append("bill", file);

    try {
      setUploading(true);
      setMessage("");

      const res = await fetch("http://192.168.1.4:5000/upload_bill", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Bill uploaded successfully! Product added to dashboard.");
        setFile(null);
        setPreview(null);
      } else {
        setMessage(data.message || "Upload failed.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Server error. Please try again.");
    }

    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg,#667eea,#764ba2)",
        fontFamily: "'Poppins', sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          padding: "35px",
          borderRadius: "14px",
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          textAlign: "center",
        }}
      >
        <h1 style={{ marginBottom: "20px" }}>Upload Warranty Bill</h1>

        <form onSubmit={handleUpload}>
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: "2px dashed #aaa",
              borderRadius: "10px",
              padding: "30px",
              marginBottom: "20px",
              background: "#f9f9f9",
              cursor: "pointer",
            }}
          >
            <p style={{ marginBottom: "10px" }}>
              Drag & Drop Bill Image Here
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />
          </div>

          {/* Image Preview */}
          {preview && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontWeight: "bold" }}>Preview</p>
              <img
                src={preview}
                alt="Bill Preview"
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg,#28a745,#2ecc71)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            {uploading ? "Uploading..." : "Upload Bill"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <p
            style={{
              marginTop: "15px",
              fontWeight: "bold",
              color: message.includes("success")
                ? "#28a745"
                : "#dc3545",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default UploadBill;