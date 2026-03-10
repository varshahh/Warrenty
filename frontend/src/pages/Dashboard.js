// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Please login first!");
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:5000/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        } else {
          setMessage("Failed to fetch products. Please try again.");
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        setMessage("Server error. Please try again later.");
      }
    };

    fetchProducts();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard</h2>
      <div style={{ marginBottom: "15px" }}>
        <Link to="/add-product" style={{ marginRight: "10px" }}>Add Product</Link>
        <Link to="/upload-bill">Upload Bill</Link>
      </div>

      {message && <p style={{ color: "red" }}>{message}</p>}

      {products.length > 0 ? (
        <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Purchase Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Days Remaining</th>
              <th>QR Code</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id}>
                <td>
                  <Link to={`/product/${p.product_id}`}>{p.product_name}</Link>
                </td>
                <td>{p.purchase_date}</td>
                <td>{p.expiry_date}</td>
                <td>{p.status}</td>
                <td>{p.days_remaining}</td>
                <td>
                  <img src={`http://127.0.0.1:5000${p.qr_url}`} alt="QR" width="50" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No products found.</p>
      )}
    </div>
  );
}

export default Dashboard;