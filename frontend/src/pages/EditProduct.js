// src/pages/EditProduct.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:5000";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [productName, setProductName] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        const res = await fetch(`${BASE_URL}/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (res.ok) {
          setProductName(data.product_name || "");
          setPurchaseDate(data.purchase_date || "");

          // ensure number type
          setWarrantyDays(
            data.warranty_days ? Number(data.warranty_days) : 365
          );
        } else {
          setMessage(data.message || "Failed to fetch product.");
        }
      } catch (err) {
        console.error(err);
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

    if (!token) {
      setMessage("Please login first.");
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
      setSaving(true);
      setMessage("");

      const res = await fetch(`${BASE_URL}/edit_product/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_name: productName.trim(),
          purchase_date: purchaseDate,
          warranty_days: Number(warrantyDays),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Product updated successfully!");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1200);
      } else {
        setMessage(data.message || "Update failed.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <h2 style={{ textAlign: "center", marginTop: "80px" }}>
        Loading Product...
      </h2>
    );
  }

  // ---------------- UI ----------------
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
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
            placeholder="Warranty Days"
            value={warrantyDays}
            onChange={(e) => setWarrantyDays(e.target.value)}
            required
            min="1"
            style={inputStyle}
          />

          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? "Updating..." : "Update Product"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "15px",
              fontWeight: "bold",
              color: message.includes("success")
                ? "#28a745"
                : "#dc3545",
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
  padding: "20px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  padding: "40px",
  borderRadius: "12px",
  backgroundColor: "#fff",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  textAlign: "center",
};

const inputStyle = {
  marginBottom: "15px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg,#764ba2,#667eea)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

export default EditProduct;