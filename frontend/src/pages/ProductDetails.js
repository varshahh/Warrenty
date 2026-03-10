import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`http://127.0.0.1:5000/product/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error("Server error while fetching product");
        }

        const data = await res.json();
        setProduct(data);

      } catch (err) {
        console.error(err);
        setError("Failed to fetch product details");
      }
    };

    fetchProduct();
  }, [id]);

  if (error) return <p>{error}</p>;

  if (!product) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>{product.product_name}</h2>

      <p><b>Purchase Date:</b> {product.purchase_date}</p>
      <p><b>Expiry Date:</b> {product.expiry_date}</p>
      <p><b>Status:</b> {product.status}</p>
      <p><b>Days Remaining:</b> {product.days_remaining}</p>

      <h3>QR Code</h3>
      <img
        src={`http://127.0.0.1:5000${product.qr_url}`}
        alt="QR Code"
        width="150"
      />

      <h3>Bill Image</h3>
      <img
        src={`http://127.0.0.1:5000${product.bill_url}`}
        alt="Bill"
        width="300"
      />
    </div>
  );
}

export default ProductDetails;