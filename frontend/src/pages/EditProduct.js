// src/pages/EditProduct.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [productName, setProductName] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // ---------------- FETCH PRODUCT ----------------
  useEffect(() => {
    const fetchProduct = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login first");
        navigate("/login");
        return;
      }

      try {
        const res = await fetch(`http://127.0.0.1:5000/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          setProductName(data.name || "");
          setPurchaseDate(data.purchase_date || "");

          // Calculate warranty days from expiry - purchase
          if (data.expiry_date && data.purchase_date) {
            const diff =
              (new Date(data.expiry_date) - new Date(data.purchase_date)) /
              (1000 * 60 * 60 * 24);
            setWarrantyDays(diff);
          } else {
            setWarrantyDays("");
          }
        } else {
          setMessage(data.message || "Failed to fetch product.");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setMessage("Server error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  // ---------------- UPDATE PRODUCT ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!productName || !warrantyDays || !purchaseDate) {
      setMessage("Please fill all fields.");
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:5000/edit_product/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_name: productName,
          purchase_date: purchaseDate,
          warranty_days: Number(warrantyDays), // ✅ Correct field name
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Product updated successfully!");
        setTimeout(() => navigate("/dashboard"), 1200);
      } else {
        setMessage(data.message || "Update failed.");
      }
    } catch (error) {
      console.error("Update error:", error);
      setMessage("Server error. Please try again.");
    }
  };

  if (loading)
    return (
      <h2 style={{ textAlign: "center", marginTop: "80px" }}>
        Loading Product...
      </h2>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg,#667eea,#764ba2)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "40px",
          borderRadius: "12px",
          backgroundColor: "#fff",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "25px" }}>Edit Product</h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
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
            }}
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
            }}
          />

          <input
            type="number"
            placeholder="Warranty Days"
            value={warrantyDays}
            onChange={(e) => setWarrantyDays(e.target.value)}
            required
            min={1}
            style={{
              marginBottom: "20px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />

          <button
            type="submit"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg,#764ba2,#667eea)",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Update Product
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "15px",
              fontWeight: "bold",
              color: message.includes("successfully") ? "#28a745" : "#dc3545",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default EditProduct;