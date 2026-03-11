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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      fontFamily: "'Poppins', sans-serif",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "40px",
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        textAlign: "center"
      }}>
        <h1 style={{ marginBottom: "25px", color: "#333" }}>Add Product</h1>

        <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            style={{
              marginBottom: "15px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              fontSize: "1rem",
              transition: "all 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#764ba2"}
            onBlur={(e) => e.target.style.borderColor = "#ccc"}
          />

          <input
            type="date"
            placeholder="Purchase Date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
            style={{
              marginBottom: "15px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              fontSize: "1rem",
              transition: "all 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#764ba2"}
            onBlur={(e) => e.target.style.borderColor = "#ccc"}
          />

          <input
            type="number"
            placeholder="Warranty Days"
            value={warrantyDays}
            onChange={(e) => setWarrantyDays(e.target.value)}
            required
            style={{
              marginBottom: "20px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              fontSize: "1rem",
              transition: "all 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#764ba2"}
            onBlur={(e) => e.target.style.borderColor = "#ccc"}
          />

          <button
            type="submit"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)" }}
            onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "none" }}
          >
            Add Product
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: "15px",
            color: message.includes("successfully") ? "#28a745" : "#dc3545",
            fontWeight: "bold"
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default AddProduct;