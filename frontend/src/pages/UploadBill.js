import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function UploadBill() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // ---------------- HANDLE FILE CHANGE ----------------
  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    // Check file type
    if (!selectedFile.type.startsWith("image/")) {
      setMessage("Only image files are allowed.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setMessage("");
  };

  // ---------------- REMOVE FILE ----------------
  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setMessage("");
  };

  // ---------------- HANDLE UPLOAD ----------------
  const handleUpload = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first.");
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

      const res = await fetch("http://127.0.0.1:5000/upload_bill", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // Do NOT set Content-Type manually
        },
        body: formData,
      });

      const response = await res.json();

      if (res.ok) {
        setMessage(response.message || "✅ Bill uploaded successfully!");
        setFile(null);
        setPreview(null);
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        setMessage(response.error || "Upload failed.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Server error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ---------------- HANDLE DRAG & DROP ----------------
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
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
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: dragging ? "2px solid #4facfe" : "2px dashed #aaa",
              borderRadius: "10px",
              padding: "30px",
              marginBottom: "20px",
              background: dragging ? "#eef5ff" : "#f9f9f9",
              transition: "0.2s",
              cursor: "pointer",
            }}
          >
            <p style={{ marginBottom: "10px", fontWeight: "500" }}>
              Drag & Drop Bill Image or click to select
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files[0])}
              style={{ cursor: "pointer" }}
            />
          </div>

          {/* Preview */}
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
              <p style={{ fontSize: "14px", marginTop: "6px" }}>{file.name}</p>
              <button
                type="button"
                onClick={removeFile}
                style={{
                  marginTop: "8px",
                  padding: "6px 12px",
                  background: "#dc3545",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          )}

          {/* Upload Button */}
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
              color:
                message.includes("success") || message.includes("✅")
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