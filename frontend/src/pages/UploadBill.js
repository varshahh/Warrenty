import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function UploadBill() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

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
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginBottom: "20px", color: "#4F46E5" }}>
          Upload Bill
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
                ? "2px solid #4F46E5"
                : "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "30px",
              marginBottom: "20px",
              background: dragging ? "#eef2ff" : "#f8fafc",
              transition: "0.2s",
            }}
          >
            <p style={{ marginBottom: "10px", fontWeight: "500" }}>
              Drag & Drop Bill Image
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileChange(e.target.files[0])
              }
            />
          </div>

          {/* PREVIEW */}
          {preview && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontWeight: "bold" }}>Preview</p>

              <img
                src={preview}
                alt="Bill Preview"
                style={previewImage}
              />

              <p style={{ fontSize: "14px", marginTop: "6px" }}>
                {file.name}
              </p>

              <button
                type="button"
                onClick={removeFile}
                style={removeButton}
              >
                Remove
              </button>
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={uploading}
            style={uploadButton}
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
                : "#ef4444",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- STYLES ----------
const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg,#eef2ff,#f8fafc)",
  padding: "20px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  padding: "30px",
  borderRadius: "16px",
  background: "#fff",
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  textAlign: "center",
};

const previewImage = {
  width: "100%",
  borderRadius: "12px",
  boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
};

const uploadButton = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  background: "#4F46E5",
  color: "#fff",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};

const removeButton = {
  marginTop: "8px",
  padding: "6px 12px",
  background: "#EF4444",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

export default UploadBill;