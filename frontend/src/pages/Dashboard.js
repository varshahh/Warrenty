import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaDownload } from "react-icons/fa";

const BASE_URL = "http://127.0.0.1:5000";

function Dashboard() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [previewBill, setPreviewBill] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);

  // ---------------- FETCH PRODUCTS ----------------
  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first!");
      setLoading(false);
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        setProducts(Array.isArray(data.products) ? data.products : []);
      } else {
        setMessage(data.message || "Failed to fetch products");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ---------------- DELETE PRODUCT ----------------
  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/delete_product/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchProducts();
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

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

  const filteredProducts = products.filter((p) =>
    p.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const total = products.length;
  const active = products.filter((p) => p.status === "Active").length;
  const expiring = products.filter((p) => p.status === "Expiring Soon").length;
  const expired = products.filter((p) => p.status === "Expired").length;

  if (loading)
    return (
      <div className="page-center">
        <div className="glass-card">Loading dashboard...</div>
      </div>
    );

  return (
    <div style={{ padding: "30px" }}>
      <h1>📦 Warranty Dashboard</h1>

      {message && (
        <p style={{ color: "red", fontWeight: "bold" }}>{message}</p>
      )}

      {/* STAT CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: "20px",
          marginBottom: "30px"
        }}
      >
        <StatCard title="Total" value={total} color="#4facfe" />
        <StatCard title="Active" value={active} color="#22c55e" />
        <StatCard title="Expiring" value={expiring} color="#facc15" />
        <StatCard title="Expired" value={expired} color="#ef4444" />
      </div>

      {/* SEARCH */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="🔍 Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchStyle}
        />
      </div>

      {/* PRODUCTS */}
      {filteredProducts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "40px" }}>
          No products yet. Upload a bill to get started.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: "20px"
          }}
        >
          {filteredProducts.map((p) => {
            const daysRemaining = p.days_remaining || 0;

            const purchase = new Date(p.purchase_date);
            const expiry = new Date(p.expiry_date);
            const totalDays = (expiry - purchase) / (1000 * 60 * 60 * 24);

            const rawProgress =
              totalDays > 0
                ? ((totalDays - daysRemaining) / totalDays) * 100
                : 0;

            const progress = Math.min(Math.max(rawProgress, 0), 100);

            const billURL = `${BASE_URL}${p.bill_url}`;
            const qrURL = `${BASE_URL}${p.qr_url}`;

            return (
              <div key={p.product_id} className="glass-card">
                <h3>
                  <Link
                    to={`/product/${p.product_id}`}
                    style={{
                      color: "#1e293b",
                      fontWeight: "600",
                      textDecoration: "none"
                    }}
                  >
                    {p.product_name || "Unknown Product"}
                  </Link>
                </h3>

                <p>📅 Purchase: {p.purchase_date}</p>
                <p>⏳ Expiry: {p.expiry_date}</p>
                <p>Days Left: {daysRemaining}</p>

                {/* PROGRESS BAR */}
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "rgba(0,0,0,0.1)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    marginTop: "10px"
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, #00ffcc, #22c55e)",
                      transition: "width 0.5s ease"
                    }}
                  />
                </div>

                <div style={buttonGrid}>
                  <button onClick={() => setPreviewBill(billURL)} className="btn-primary">
                    View
                  </button>

                  <button
                    onClick={() => forceDownload(billURL, "bill.png")}
                    className="btn-primary"
                  >
                    <FaDownload /> Bill
                  </button>

                  <Link to={`/edit-product/${p.product_id}`} className="btn-primary">
                    Edit
                  </Link>

                  <button
                    onClick={() => deleteProduct(p.product_id)}
                    className="btn-primary"
                  >
                    Delete
                  </button>
                </div>

                <div style={{ textAlign: "center", marginTop: "10px" }}>
                  <img
                    src={qrURL}
                    alt="QR"
                    style={{ width: "80px", cursor: "pointer" }}
                    onClick={() => setQrPreview(qrURL)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewBill && <PreviewModal src={previewBill} onClose={() => setPreviewBill(null)} />}
      {qrPreview && <PreviewModal src={qrPreview} onClose={() => setQrPreview(null)} />}
    </div>
  );
}

// ✅ FIXED STAT CARD
const StatCard = ({ title, value, color }) => (
  <div
    className="glass-card"
    style={{
      textAlign: "center",
      color: "#1e293b"
    }}
  >
    <h4>{title}</h4>
    <h2 style={{ color }}>{value}</h2>
  </div>
);

const searchStyle = {
  padding: "12px 18px",
  borderRadius: "10px",
  border: "none",
  outline: "none",
  width: "350px",
  maxWidth: "100%",
  background: "rgba(255,255,255,0.15)",
  backdropFilter: "blur(10px)",
  color: "white",
};

const PreviewModal = ({ src, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}
  >
    <img src={src} alt="preview" style={{ maxWidth: "80%", maxHeight: "80%" }} />
  </div>
);

const buttonGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: "8px",
  marginTop: "12px"
};

export default Dashboard;