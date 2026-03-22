import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaDownload } from "react-icons/fa";

const BASE_URL = "http://127.0.0.1:5000";
const FRONTEND_URL = "http://localhost:3000";

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

      const data = await res.json();

      if (res.ok) {
        fetchProducts();
      } else {
        alert(data.message || "Delete failed");
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

  // ---------------- SHARE PRODUCT ----------------
  const shareProduct = (product) => {
    const productLink = `${FRONTEND_URL}/product/${product.product_id}`;

    if (navigator.share) {
      navigator.share({
        title: product.product_name,
        text: "View warranty details",
        url: productLink
      });
    } else {
      navigator.clipboard.writeText(productLink);
      alert("Product link copied!");
    }
  };

  const getBadgeColor = (status) => {
    if (status === "Active") return "#28a745";
    if (status === "Expiring Soon") return "#ffc107";
    if (status === "Expired") return "#dc3545";
    return "#6c757d";
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
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontSize: "20px"
        }}
      >
        Loading dashboard...
      </div>
    );

  return (
    <div
      style={{
        padding: "40px",
        minHeight: "100vh",
        background: "linear-gradient(to right,#f5f7fa,#c3cfe2)"
      }}
    >
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
        <StatCard title="Active" value={active} color="#28a745" />
        <StatCard title="Expiring" value={expiring} color="#ffc107" />
        <StatCard title="Expired" value={expired} color="#dc3545" />
      </div>

      {/* SEARCH + UPLOAD */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px"
        }}
      >
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            width: "250px"
          }}
        />

        <Link to="/upload-bill" style={linkStyle("#764ba2")}>
          Upload Bill
        </Link>
      </div>

      {/* PRODUCTS */}
      {filteredProducts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "#fff"
          }}
        >
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

            // NEW PROGRESS CALCULATION USING DATES
            const purchase = new Date(p.purchase_date);
            const expiry = new Date(p.expiry_date);
            const totalDays =
              (expiry - purchase) / (1000 * 60 * 60 * 24);

            const progress =
              totalDays > 0 ? (daysRemaining / totalDays) * 100 : 0;

            const billURL = `${BASE_URL}${p.bill_url}`;
            const qrURL = `${BASE_URL}${p.qr_url}`;

            return (
              <div
                key={p.product_id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.1)"
                }}
              >
                <h3>
                  <Link
                    to={`/product/${p.product_id}`}
                    style={{ color: "#333" }}
                  >
                    {p.product_name}
                  </Link>
                </h3>

                <p>📅 Purchase: {p.purchase_date}</p>
                <p>⏳ Expiry: {p.expiry_date}</p>
                <p>Days Left: {daysRemaining}</p>

                <div
                  style={{
                    background: "#eee",
                    height: "8px",
                    borderRadius: "5px"
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: getBadgeColor(p.status)
                    }}
                  />
                </div>

                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => setPreviewBill(billURL)}
                    style={buttonStyle("#17a2b8")}
                  >
                    View
                  </button>

                  <button
                    onClick={() =>
                      forceDownload(billURL, "bill.png")
                    }
                    style={buttonStyle("#4facfe")}
                  >
                    <FaDownload /> Bill
                  </button>

                  <button
                    onClick={() => shareProduct(p)}
                    style={buttonStyle("#28a745")}
                  >
                    Share
                  </button>

                  <Link
                    to={`/edit-product/${p.product_id}`}
                    style={linkStyle("#ffc107", "#000")}
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => deleteProduct(p.product_id)}
                    style={buttonStyle("#dc3545")}
                  >
                    Delete
                  </button>
                </div>

                <div
                  style={{ textAlign: "center", marginTop: "10px" }}
                >
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

      {previewBill && (
        <PreviewModal
          src={previewBill}
          onClose={() => setPreviewBill(null)}
        />
      )}

      {qrPreview && (
        <PreviewModal
          src={qrPreview}
          onClose={() => setQrPreview(null)}
        />
      )}
    </div>
  );
}

// ---------------- COMPONENTS ----------------
const StatCard = ({ title, value, color }) => (
  <div style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
    <h4>{title}</h4>
    <h2 style={{ color }}>{value}</h2>
  </div>
);

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
    <img
      src={src}
      alt="preview"
      style={{ maxWidth: "80%", maxHeight: "80%" }}
    />
  </div>
);

const buttonStyle = (bg) => ({
  margin: "5px",
  background: bg,
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer"
});

const linkStyle = (bg, color = "#fff") => ({
  margin: "5px",
  background: bg,
  color,
  padding: "6px 10px",
  borderRadius: "6px",
  textDecoration: "none"
});

export default Dashboard;