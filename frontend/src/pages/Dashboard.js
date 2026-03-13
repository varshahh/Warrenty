import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

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
      const res = await fetch("http://127.0.0.1:5000/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
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
    const confirmDelete = window.confirm("Delete this product?");
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/delete_product/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchProducts(); // refresh list after deletion
      } else {
        alert(data.message || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // ---------------- BADGE COLOR ----------------
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontSize: "20px" }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "40px",
        minHeight: "100vh",
        background: "linear-gradient(to right,#f5f7fa,#c3cfe2)",
      }}
    >
      <h1 style={{ marginBottom: "10px" }}>📦 Warranty Dashboard</h1>

      {message && (
        <p style={{ color: "red", marginBottom: "20px", fontWeight: "bold" }}>
          {message}
        </p>
      )}

      {/* STATISTICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <StatCard title="Total Products" value={total} color="#4facfe" />
        <StatCard title="Active" value={active} color="#28a745" />
        <StatCard title="Expiring Soon" value={expiring} color="#ffc107" />
        <StatCard title="Expired" value={expired} color="#dc3545" />
      </div>

      {/* SEARCH + UPLOAD */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "25px",
          flexWrap: "wrap",
          gap: "10px",
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
            border: "1px solid #ccc",
            width: "250px",
          }}
        />
        <Link
          to="/upload-bill"
          style={{
            padding: "10px 20px",
            background: "#764ba2",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Upload Bill
        </Link>
      </div>

      {/* PRODUCT GRID */}
      {filteredProducts.length === 0 ? (
        <div
          style={{
            background: "#fff",
            padding: "40px",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          No products found
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: "25px",
          }}
        >
          {filteredProducts.map((p) => {
            const daysRemaining = Math.max(0, p.days_remaining || 0);
            const progress = Math.max(0, Math.min(100, (daysRemaining / 365) * 100));
            const billURL = p.bill_url ? `http://127.0.0.1:5000${p.bill_url}` : null;
            const qrURL = p.qr_url ? `http://127.0.0.1:5000${p.qr_url}` : null;

            return (
              <div
                key={p.product_id}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "22px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                }}
              >
                <h2>
                  <Link
                    to={`/product/${p.product_id}`}
                    style={{ textDecoration: "none", color: "#333" }}
                  >
                    {p.product_name}
                  </Link>
                </h2>
                <p><b>Purchase:</b> {p.purchase_date}</p>
                <p><b>Expiry:</b> {p.expiry_date}</p>
                <p><b>Days Remaining:</b> {daysRemaining}</p>

                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    color: "#fff",
                    display: "inline-block",
                    background: getBadgeColor(p.status),
                  }}
                >
                  {p.status}
                </div>

                {/* PROGRESS BAR */}
                <div
                  style={{
                    background: "#eee",
                    height: "10px",
                    borderRadius: "10px",
                    marginTop: "12px",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: "10px",
                      background: getBadgeColor(p.status),
                    }}
                  />
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ marginTop: "15px" }}>
                  {billURL && (
                    <>
                      <button
                        onClick={() => setPreviewBill(billURL)}
                        style={buttonStyle("#17a2b8")}
                      >
                        View Bill
                      </button>

                      <a
                        href={billURL}
                        download={`${p.product_name}_bill.png`}
                        style={linkStyle("#4facfe")}
                      >
                        Download Bill
                      </a>

                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: p.product_name, text: "Warranty Bill", url: billURL });
                          } else {
                            navigator.clipboard.writeText(billURL).then(() => alert("Bill link copied!"));
                          }
                        }}
                        style={buttonStyle("#28a745")}
                      >
                        Share Bill
                      </button>
                    </>
                  )}

                  <Link to={`/edit-product/${p.product_id}`} style={linkStyle("#ffc107", "#000")}>
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteProduct(p.product_id)}
                    style={buttonStyle("#dc3545")}
                  >
                    Delete
                  </button>
                </div>

                {/* QR CODE */}
                {qrURL && (
                  <div style={{ textAlign: "center", marginTop: "15px" }}>
                    <img
                      src={qrURL}
                      alt="QR"
                      style={{ width: "90px", cursor: "pointer" }}
                      onClick={() => setQrPreview(qrURL)}
                    />
                    <br />
                    <a
                      href={qrURL}
                      download={`${p.product_name}_qr.png`}
                      style={linkStyle("#28a745")}
                    >
                      Download QR
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BILL PREVIEW MODAL */}
      {previewBill && modalPreview(previewBill, () => setPreviewBill(null), 0.8)}

      {/* QR PREVIEW MODAL */}
      {qrPreview && modalPreview(qrPreview, () => setQrPreview(null), 0.5)}
    </div>
  );
}

// ---------------- STYLES & COMPONENTS ----------------
function StatCard({ title, value, color }) {
  return (
    <div style={{
      background: "#fff",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    }}>
      <h4 style={{ color: "#555" }}>{title}</h4>
      <h2 style={{ color }}>{value}</h2>
    </div>
  );
}

const buttonStyle = (bg) => ({
  marginRight: "8px",
  background: bg,
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
});

const linkStyle = (bg, color = "#fff") => ({
  marginRight: "8px",
  background: bg,
  color,
  padding: "6px 10px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
});

const modalPreview = (src, onClose, scale = 0.8) => (
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
      alignItems: "center",
      cursor: "pointer",
      zIndex: 9999,
    }}
  >
    <img
      src={src}
      alt="Preview"
      style={{ maxWidth: `${scale * 100}%`, maxHeight: `${scale * 100}%`, borderRadius: "10px" }}
    />
  </div>
);

export default Dashboard;