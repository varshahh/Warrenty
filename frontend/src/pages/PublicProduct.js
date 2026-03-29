import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function PublicProduct() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/public/product/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message) setError(data.message);
        else setProduct(data);
      })
      .catch(() => setError("Server error"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-center"><div className="glass-card">Loading...</div></div>;
  if (error)   return <div className="page-center"><div className="glass-card">{error}</div></div>;

  const progress = Math.min((product.days_remaining / 365) * 100, 100);
  const barColor = progress <= 25 ? "#ef4444" : progress <= 50 ? "#facc15" : "#22c55e";
  const statusColor = product.status === "Expired" ? "#ef4444" : "#22c55e";

  return (
    <div className="page-center">
      <div className="glass-card" style={{ width: "420px", textAlign: "center" }}>
        <h1 style={{ marginBottom: "6px" }}>Warranty Info</h1>
        <p style={{ color: "#aaa", marginBottom: "20px", fontSize: "13px" }}>Scanned via QR Code</p>

        <h2 style={{ marginBottom: "16px" }}>{product.product_name}</h2>
        <p>Category: {product.category}</p>
        <p>📅 Purchase Date: {product.purchase_date}</p>
        <p>⏳ Expiry Date: {product.expiry_date}</p>
        <p>Days Remaining: {product.days_remaining}</p>

        <p style={{ marginTop: "12px", fontWeight: "bold", color: statusColor }}>
          Status: {product.status}
        </p>

        <div style={{ background: "#eee", height: "10px", borderRadius: "10px", marginTop: "16px" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: barColor, borderRadius: "10px" }} />
        </div>
      </div>
    </div>
  );
}

export default PublicProduct;
