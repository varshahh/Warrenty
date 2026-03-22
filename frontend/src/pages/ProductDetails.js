import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaDownload } from "react-icons/fa";

const BASE_URL = "http://127.0.0.1:5000";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [preview, setPreview] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ---------------- FORCE DOWNLOAD ----------------
  const forceDownload = async (url, filename) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network error");

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
      alert("Download failed.");
    }
  };

  // ---------------- FETCH PRODUCT ----------------
  const fetchProduct = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setProduct({
          product_name: data.product_name,
          purchase_date: data.purchase_date,
          warranty_days: data.warranty_days,
          expiry_date: data.expiry_date,
          status: data.status,
          days_remaining: data.days_remaining,
          bill_url: data.bill_url,
          qr_url: data.qr_url,
        });
      } else {
        alert(data.message || "Failed to fetch product");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // ---------------- DELETE PRODUCT ----------------
  const deleteProduct = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/delete_product/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Product deleted");
        navigate("/dashboard");
      } else {
        alert(data.message || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // ---------------- UPLOAD BILL ----------------
  const handleBillUpload = async () => {
    if (!billFile) {
      alert("Select a file first");
      return;
    }

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("bill", billFile);
    formData.append("product_id", id);

    try {
      setUploading(true);

      const res = await axios.post(`${BASE_URL}/upload_bill`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200) {
        alert("✅ Bill uploaded successfully");
        setBillFile(null);
        fetchProduct();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ---------------- SHARE FUNCTION REMOVED ----------------
  // (Deleted as requested)

  // ---------------- LOADING STATES ----------------
  if (loading)
    return <h2 style={{ textAlign: "center", marginTop: "80px" }}>Loading...</h2>;

  if (!product)
    return (
      <h2 style={{ textAlign: "center", marginTop: "80px" }}>
        Product not found
      </h2>
    );

  const progress = Math.max(
    0,
    Math.min(
      100,
      (product.days_remaining / product.warranty_days) * 100
    )
  );

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1>📄 Warranty Details</h1>
        <h2>{product.product_name}</h2>

        <div style={{ marginBottom: "20px" }}>
          <Link to={`/edit-product/${id}`} style={editButton}>
            Edit Product
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            style={deleteButton}
          >
            Delete Product
          </button>
        </div>

        <p><b>Purchase Date:</b> {product.purchase_date}</p>
        <p><b>Expiry Date:</b> {product.expiry_date}</p>
        <p><b>Days Remaining:</b> {product.days_remaining}</p>

        <div style={progressBar}>
          <div style={{ ...progressFill, width: `${progress}%` }} />
        </div>

        {/* BILL */}
        {product.bill_url && (
          <div style={{ marginTop: "30px" }}>
            <h3>🧾 Bill</h3>

            <img
              src={`${BASE_URL}${product.bill_url}`}
              alt="Bill"
              style={billImage}
              onClick={() =>
                setPreview(`${BASE_URL}${product.bill_url}`)
              }
            />

            <button
              onClick={() =>
                forceDownload(
                  `${BASE_URL}${product.bill_url}`,
                  `${product.product_name}_bill.png`
                )
              }
              style={actionButton}
            >
              <FaDownload /> Download
            </button>
          </div>
        )}

        {/* UPLOAD BILL */}
        <div style={{ marginTop: "30px" }}>
          <h3>⬆ Upload New Bill</h3>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBillFile(e.target.files[0])}
          />

          <button
            onClick={handleBillUpload}
            disabled={uploading}
            style={actionButton}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {/* QR */}
        {product.qr_url && (
          <div style={{ marginTop: "30px" }}>
            <h3>📱 QR Code</h3>

            <img
              src={`${BASE_URL}${product.qr_url}`}
              alt="QR"
              style={{ width: "120px", cursor: "pointer" }}
              onClick={() =>
                setQrPreview(`${BASE_URL}${product.qr_url}`)
              }
            />

            <button
              onClick={() =>
                forceDownload(
                  `${BASE_URL}${product.qr_url}`,
                  `${product.product_name}_qr.png`
                )
              }
              style={actionButton}
            >
              <FaDownload /> Download QR
            </button>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {preview && (
        <PreviewModal
          src={preview}
          onClose={() => setPreview(null)}
        />
      )}

      {qrPreview && (
        <PreviewModal
          src={qrPreview}
          onClose={() => setQrPreview(null)}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          onDelete={deleteProduct}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

// ---------- MODALS ----------
const PreviewModal = ({ src, onClose }) => (
  <div onClick={onClose} style={modalOverlay}>
    <img src={src} alt="preview" style={{ maxWidth: "80%", maxHeight: "80%" }} />
  </div>
);

const DeleteModal = ({ onDelete, onCancel }) => (
  <div style={modalOverlay}>
    <div style={deleteBox}>
      <h3>Delete Product?</h3>
      <button onClick={onDelete} style={deleteButton}>
        Delete
      </button>
      <button onClick={onCancel} style={cancelButton}>
        Cancel
      </button>
    </div>
  </div>
);

// ---------- STYLES ----------
const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(to right,#f5f7fa,#c3cfe2)",
  padding: "40px",
};

const cardStyle = {
  maxWidth: "520px",
  margin: "auto",
  padding: "35px",
  borderRadius: "16px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  textAlign: "center",
  background: "#fff",
};

const billImage = {
  width: "100%",
  borderRadius: "12px",
  cursor: "pointer",
};

const actionButton = {
  margin: "6px",
  padding: "8px 14px",
  background: "#28a745",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const editButton = {
  padding: "8px 16px",
  background: "#764ba2",
  color: "#fff",
  borderRadius: "6px",
  textDecoration: "none",
  marginRight: "10px",
};

const deleteButton = {
  padding: "8px 16px",
  background: "#dc3545",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const cancelButton = {
  padding: "8px 16px",
  background: "#ccc",
  border: "none",
  borderRadius: "6px",
  marginLeft: "10px",
};

const progressBar = {
  background: "#eee",
  height: "10px",
  borderRadius: "10px",
  marginTop: "20px",
};

const progressFill = {
  height: "100%",
  background: "#28a745",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const deleteBox = {
  background: "#fff",
  padding: "30px",
  borderRadius: "12px",
  textAlign: "center",
};

export default ProductDetails;