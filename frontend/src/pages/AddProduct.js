// src/pages/AddProduct.js
import React, { useState } from "react";

function AddProduct() {
  const [productName, setProductName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("");
  const [message, setMessage] = useState("");

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first!");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/add_product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_name: productName,
          purchase_date: purchaseDate,
          warranty_period_days: warrantyDays,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Product added successfully!");
        setProductName("");
        setPurchaseDate("");
        setWarrantyDays("");
      } else {
        setMessage(data.message || "Failed to add product.");
      }
    } catch (error) {
      console.error("Add Product error:", error);
      setMessage("Server error. Please try again later.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "20px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "5px" }}>
      <h2>Add Product</h2>
      <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column" }}>
        <input
          placeholder="Product Name"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "8px" }}
        />
        <input
          placeholder="Purchase Date (YYYY-MM-DD)"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "8px" }}
        />
        <input
          placeholder="Warranty Days"
          type="number"
          value={warrantyDays}
          onChange={(e) => setWarrantyDays(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "8px" }}
        />
        <button
          type="submit"
          style={{ padding: "10px", background: "#007bff", color: "#fff", border: "none", borderRadius: "3px" }}
        >
          Add Product
        </button>
      </form>
      {message && (
        <p style={{ marginTop: "10px", color: message.includes("successfully") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default AddProduct;