import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

function ProductDetails() {

  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {

    const fetchProduct = async () => {
      try {
        const res = await fetch(`http://192.168.1.4:5000/product/${id}`);
        const data = await res.json();
        setProduct(data);
      } catch (error) {
        console.log("Error fetching product:", error);
      }
    };

    fetchProduct();

  }, [id]);

  if (!product)
    return (
      <h2 style={{ textAlign: "center", marginTop: "80px" }}>
        Loading Product Details...
      </h2>
    );

  // Status gradient
  let badgeGradient = "linear-gradient(135deg,#555,#777)";
  if (product.status === "Active")
    badgeGradient = "linear-gradient(135deg,#28a745,#2ecc71)";
  if (product.status === "Expiring Soon")
    badgeGradient = "linear-gradient(135deg,#ffc107,#ffb347)";
  if (product.status === "Expired")
    badgeGradient = "linear-gradient(135deg,#dc3545,#e74c3c)";

  const daysStyle = {
    color: product.days_remaining <= 5 ? "#dc3545" : "#28a745",
    fontWeight: "bold",
    fontSize: "1.3rem"
  };

  const progress = Math.max(
    0,
    Math.min(100, (product.days_remaining / 365) * 100)
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to right,#f5f7fa,#c3cfe2)",
        padding: "40px",
        fontFamily: "'Poppins', sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          margin: "auto",
          padding: "35px",
          borderRadius: "16px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
          textAlign: "center",
          background: "#fff"
        }}
      >
        <h1 style={{ marginBottom: "25px", color: "#333" }}>
          📄 Warranty Details
        </h1>

        <h2 style={{ marginBottom: "15px", color: "#222" }}>
          {product.product_name}
        </h2>

        <p><b>Purchase Date:</b> {product.purchase_date}</p>
        <p><b>Expiry Date:</b> {product.expiry_date}</p>

        <div style={{ margin: "15px 0" }}>
          <b>Days Remaining:</b>
          <span style={{ ...daysStyle, marginLeft: "6px" }}>
            {product.days_remaining}
          </span>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: "inline-block",
            padding: "12px 25px",
            borderRadius: "25px",
            background: badgeGradient,
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1rem",
            marginTop: "15px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
          }}
        >
          {product.status}
        </div>

        {/* Warranty Progress */}
        <div
          style={{
            marginTop: "25px",
            background: "#eee",
            height: "10px",
            borderRadius: "10px",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background:
                product.status === "Expired"
                  ? "#dc3545"
                  : product.status === "Expiring Soon"
                  ? "#ffc107"
                  : "#28a745"
            }}
          ></div>
        </div>

        {/* Bill Image */}
        {product.bill_url && (
          <div style={{ marginTop: "35px" }}>
            <h3 style={{ marginBottom: "15px", color: "#333" }}>
              🧾 Bill Image
            </h3>

            <img
              src={`http://192.168.1.4:5000${product.bill_url}`}
              alt="Bill"
              style={{
                width: "100%",
                borderRadius: "12px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                cursor: "pointer"
              }}
              onClick={() =>
                setPreview(`http://192.168.1.4:5000${product.bill_url}`)
              }
            />

            <br /><br />

            <a
              href={`http://192.168.1.4:5000${product.bill_url}`}
              download
              style={{
                padding: "8px 16px",
                background: "#4facfe",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "bold"
              }}
            >
              Download Bill
            </a>
          </div>
        )}

        {/* QR Code */}
        {product.qr_url && (
          <div style={{ marginTop: "35px" }}>
            <h3>📱 Product QR Code</h3>

            <img
              src={`http://192.168.1.4:5000${product.qr_url}`}
              alt="QR"
              style={{
                width: "120px",
                marginTop: "10px",
                borderRadius: "6px"
              }}
            />
          </div>
        )}

      </div>

      {/* Bill Preview Modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <img
            src={preview}
            alt="Bill"
            style={{
              maxWidth: "80%",
              maxHeight: "80%",
              borderRadius: "10px"
            }}
          />
        </div>
      )}

    </div>
  );
}

export default ProductDetails;