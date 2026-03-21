// src/pages/AddProduct.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function AddProduct() {

  const navigate = useNavigate();

  const [productName, setProductName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const BASE_URL = "http://127.0.0.1:5000";

  const handleAddProduct = async (e) => {

    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first!");
      return;
    }

    if (!productName.trim() || !purchaseDate || !warrantyDays) {
      setMessage("Please fill all fields.");
      return;
    }

    if (Number(warrantyDays) <= 0) {
      setMessage("Warranty days must be greater than 0.");
      return;
    }

    try {

      setLoading(true);
      setMessage("");

      const res = await fetch(`${BASE_URL}/add_product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          product_name: productName.trim(),
          purchase_date: purchaseDate,
          warranty_days: Number(warrantyDays)
        })
      });

      const data = await res.json();

      if (res.ok) {

        setMessage("✅ Product added successfully!");

        setProductName("");
        setPurchaseDate("");
        setWarrantyDays("");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1200);

      } else {

        setMessage(data.message || "Failed to add product.");

      }

    } catch (err) {

      console.error(err);
      setMessage("Server error. Please try again.");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div style={pageStyle}>

      <div style={cardStyle}>

        <h1 style={{ marginBottom: "10px", color: "#333" }}>
          Add Warranty Product
        </h1>

        <p style={{ color: "#666", marginBottom: "25px", fontSize: "14px" }}>
          Enter product details manually.
        </p>

        <form
          onSubmit={handleAddProduct}
          style={{ display: "flex", flexDirection: "column" }}
        >

          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="number"
            placeholder="Warranty Duration (Days)"
            value={warrantyDays}
            onChange={(e) => setWarrantyDays(e.target.value)}
            min="1"
            required
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
          >
            {loading ? "Adding Product..." : "Add Product"}
          </button>

        </form>

        {message && (
          <p
            style={{
              marginTop: "15px",
              fontWeight: "bold",
              color: message.includes("success")
                ? "#28a745"
                : "#dc3545"
            }}
          >
            {message}
          </p>
        )}

      </div>

    </div>

  );

}

// ---------------- STYLES ----------------

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg,#667eea,#764ba2)",
  padding: "20px"
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  padding: "40px",
  borderRadius: "12px",
  backgroundColor: "#fff",
  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
  textAlign: "center"
};

const inputStyle = {
  marginBottom: "15px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg,#667eea,#764ba2)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer"
};

export default AddProduct;