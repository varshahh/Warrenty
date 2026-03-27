import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function UploadBill() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState("Other");

  const BASE_URL = "http://127.0.0.1:5000";

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setMessage("Only image files are allowed.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setMessage("");
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setMessage("");
  };

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
    formData.append("category", category);

    try {
      setUploading(true);
      setMessage("");

      const res = await fetch(`${BASE_URL}/upload_bill`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Product created from bill!");
        setFile(null);
        setPreview(null);

        setTimeout(() => {
          navigate("/dashboard");
        }, 1200);
      } else {
        setMessage(data.message || "Upload failed.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-center">
      <div
        className="glass-card"
        style={{ width: "420px", textAlign: "center" }}
      >
        <h1 style={{ marginBottom: "20px" }}>
          📤 Upload Bill
        </h1>

        <form onSubmit={handleUpload}>

          {/* DRAG AREA */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFileChange(e.dataTransfer.files[0]);
            }}
            style={{
              border: dragging
                ? "2px solid #00ffcc"
                : "2px dashed rgba(255,255,255,0.4)",
              borderRadius: "14px",
              padding: "35px 20px",
              marginBottom: "20px",
              background: dragging
                ? "rgba(0,255,204,0.1)"
                : "rgba(255,255,255,0.05)",
              transition: "all 0.3s ease",
              position: "relative",
              cursor: "pointer"
            }}
          >
            {/* ICON */}
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>
              📤
            </div>

            <p style={{ fontWeight: "600", marginBottom: "6px" }}>
              Drop your bill here
            </p>

            <p style={{ fontSize: "12px", opacity: 0.7 }}>
              or click to browse
            </p>

            {/* HIDDEN INPUT */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileChange(e.target.files[0])
              }
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                opacity: 0,
                cursor: "pointer"
              }}
            />
          </div>

          {/* PREVIEW */}
          {preview && (
            <div style={{ marginBottom: "20px" }}>
              <img
                src={preview}
                alt="Bill Preview"
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  marginBottom: "8px"
                }}
              />

              <p style={{ fontSize: "13px", opacity: 0.8 }}>
                {file.name}
              </p>

              <button
                type="button"
                onClick={removeFile}
                style={{
                  marginTop: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Remove
              </button>
            </div>
          )}

          {/* CATEGORY */}
          <div style={{ marginBottom: "16px", textAlign: "left" }}>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", display: "block", marginBottom: "6px" }}>
              🏷️ Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
                outline: "none",
                fontSize: "14px"
              }}
            >
              {["Electronics","Appliances","Furniture","Vehicle","Mobile","Laptop","Other"].map(c => (
                <option key={c} value={c} style={{ color: "#000" }}>{c}</option>
              ))}
            </select>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary"
            style={{ width: "100%" }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.03)";
              e.target.style.boxShadow =
                "0 8px 20px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "none";
            }}
          >
            {uploading ? "Uploading..." : "Upload & Create"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "15px",
              fontWeight: "bold",
              color: message.includes("✅")
                ? "#22c55e"
                : "#ef4444"
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