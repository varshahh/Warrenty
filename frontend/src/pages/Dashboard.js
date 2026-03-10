import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Dashboard() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:5000/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProducts(data);
    };
    fetchProducts();
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <Link to="/add-product">Add Product</Link>
      <Link to="/upload-bill" style={{ marginLeft: "10px" }}>Upload Bill</Link>
      <table border="1" style={{ marginTop: "10px" }}>
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
          {products.map(p => (
            <tr key={p.product_id}>
              <td>{p.product_name}</td>
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
    </div>
  );
}

export default Dashboard;