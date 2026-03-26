import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FaDownload } from "react-icons/fa";

const BASE_URL = "http://127.0.0.1:5000";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [preview, setPreview] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [loading, setLoading] = useState(true);

  // ---------------- FORCE DOWNLOAD ----------------
  const forceDownload = async (url, filename) => {
    try {
      const res = await fetch(url);
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
      console.error(err);
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
        setProduct(data);
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

  // ---------------- DELETE ----------------
  const deleteProduct = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${BASE_URL}/delete_product/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        navigate("/dashboard");
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Server error");
    }
  };

  if (loading)
    return (
      <div className="page-center">
        <div className="glass-card">Loading...</div>
      </div>
    );

  if (!product)
    return (
      <div className="page-center">
        <div className="glass-card">Product not found</div>
      </div>
    );

  const progress =
    (product.days_remaining / product.warranty_days) * 100;

  return (
    <div className="page-center">
      <div
        className="glass-card"
        style={{ width: "520px", textAlign: "center" }}
      >
        {/* Warranty Title */}
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px"
          }}
        >
          Warranty Details
        </h1>

        <h2>{product.product_name}</h2>

        <div style={{ marginBottom: "20px" }}>
          <Link
            to={`/edit-product/${id}`}
            className="btn-primary"
          >
            Edit Product
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-primary"
            style={{
              background:
                "linear-gradient(135deg,#ef4444,#dc2626)"
            }}
          >
            Delete Product
          </button>
        </div>

        <p>📅 Purchase: {product.purchase_date}</p>
        <p>⏳ Expiry: {product.expiry_date}</p>
        <p>Days Left: {product.days_remaining}</p>

        <div
          style={{
            background: "#eee",
            height: "10px",
            borderRadius: "10px",
            marginTop: "20px"
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#22c55e"
            }}
          />
        </div>

        {/* BILL */}
        {product.bill_url && (
          <div style={{ marginTop: "30px" }}>
            <h3
              style={{
                textAlign: "center",
                marginBottom: "10px"
              }}
            >
              Bill
            </h3>

            <img
              src={`${BASE_URL}${product.bill_url}`}
              alt="Bill"
              style={{
                width: "100%",
                borderRadius: "12px",
                cursor: "pointer"
              }}
              onClick={() =>
                setPreview(
                  `${BASE_URL}${product.bill_url}`
                )
              }
            />

            <button
              className="btn-primary"
              onClick={() =>
                forceDownload(
                  `${BASE_URL}${product.bill_url}`,
                  "bill.png"
                )
              }
            >
              <FaDownload /> Download
            </button>
          </div>
        )}

        {/* QR */}
        {product.qr_url && (
          <div style={{ marginTop: "30px" }}>
            <h3>QR Code</h3>

            <img
              src={`${BASE_URL}${product.qr_url}`}
              alt="QR"
              style={{
                width: "120px",
                cursor: "pointer"
              }}
              onClick={() =>
                setQrPreview(
                  `${BASE_URL}${product.qr_url}`
                )
              }
            />

            <button
              className="btn-primary"
              onClick={() =>
                forceDownload(
                  `${BASE_URL}${product.qr_url}`,
                  "qr.png"
                )
              }
            >
              Download QR
            </button>
          </div>
        )}
      </div>

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
          onCancel={() =>
            setShowDeleteModal(false)
          }
        />
      )}
    </div>
  );
}

// ---------- MODALS ----------

const PreviewModal = ({ src, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <img
      src={src}
      alt="preview"
      style={{
        maxWidth: "80%",
        maxHeight: "80%"
      }}
    />
  </div>
);

const DeleteModal = ({ onDelete, onCancel }) => (
  <div className="modal-overlay">
    <div className="glass-card">
      <h3>Delete Product?</h3>

      <button
        className="btn-primary"
        style={{
          background:
            "linear-gradient(135deg,#ef4444,#dc2626)"
        }}
        onClick={onDelete}
      >
        Delete
      </button>

      <button
        className="btn-primary"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  </div>
);

export default ProductDetails;