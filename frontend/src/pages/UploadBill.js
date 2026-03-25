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
    <div className="page-center">
      <div
        className="glass-card"
        style={{
          width: "420px",
          textAlign: "center"
        }}
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
                ? "2px solid #4facfe"
                : "2px dashed rgba(255,255,255,0.3)",
              borderRadius: "12px",
              padding: "30px",
              marginBottom: "20px",
              background: dragging
                ? "rgba(255,255,255,0.15)"
                : "rgba(255,255,255,0.05)",
              transition: "0.3s"
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
              <p style={{ fontWeight: "bold" }}>
                Preview
              </p>

              <img
                src={preview}
                alt="Bill Preview"
                style={{
                  width: "100%",
                  borderRadius: "12px"
                }}
              />

              <p
                style={{
                  fontSize: "14px",
                  marginTop: "6px"
                }}
              >
                {file.name}
              </p>

              <button
                type="button"
                onClick={removeFile}
                className="btn-primary"
                style={{
                  background:
                    "linear-gradient(135deg,#ef4444,#dc2626)"
                }}
              >
                Remove
              </button>
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            {uploading
              ? "Uploading..."
              : "Upload & Create"}
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