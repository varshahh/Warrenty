// src/pages/EditProduct.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Other");
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
          setCategory(data.category || "Other");
          setPurchaseDate(data.purchase_date || "");
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
          category,
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
    return <h2 style={loadingStyle}>Loading Product...</h2>;
  }

  // ---------------- UI ----------------
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>✏ Edit Product</h2>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          
          {/* Product Name */}
          <div style={inputGroup}>
            <span style={iconStyle}>🛒</span>
            <input
              type="text"
              placeholder="Product Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div style={inputGroup}>
            <span style={iconStyle}>🏷️</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {["Appliances","Electronics","Mobile","Laptop","Other"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Purchase Date */}
          <div style={inputGroup}>
            <span style={iconStyle}>📅</span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Warranty */}
          <div style={inputGroup}>
            <span style={iconStyle}>⏳</span>
            <input
              type="number"
              placeholder="Warranty Days"
              value={warrantyDays}
              onChange={(e) => setWarrantyDays(e.target.value)}
              required
              min="1"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.03)";
              e.target.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "none";
            }}
          >
            {saving ? "Updating..." : "Update Product"}
          </button>
        </form>

        {message && <p style={messageStyle(message)}>{message}</p>}
      </div>
    </div>
  );
}

// ---------------- STYLES ----------------

// ✅ FIXED: removed background from here
const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  padding: "35px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.15)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "white",
};

const titleStyle = {
  marginBottom: "25px",
  fontSize: "22px",
  fontWeight: "600",
  textAlign: "center",
};

const inputGroup = {
  position: "relative",
  marginBottom: "18px",
};

const iconStyle = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "12px 12px 12px 38px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.2)",
  border: "1px solid rgba(255,255,255,0.3)",
  color: "white",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg,#6a11cb,#2575fc)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "all 0.3s ease",
};

const messageStyle = (msg) => ({
  marginTop: "15px",
  fontWeight: "bold",
  textAlign: "center",
  color: msg.includes("success") ? "#90ee90" : "#ffb3b3",
});

const loadingStyle = {
  textAlign: "center",
  marginTop: "80px",
  color: "white",
};

export default EditProduct;