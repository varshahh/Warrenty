import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:5000/product/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProduct(data);
    };
    fetchProduct();
  }, [id]);

  if (!product) return <p>Loading...</p>;

  return (
    <div>
      <h2>{product.product_name}</h2>
      <p>Purchase Date: {product.purchase_date}</p>
      <p>Expiry Date: {product.expiry_date}</p>
      <p>Status: {product.status}</p>
      <p>Days Remaining: {product.days_remaining}</p>
      <img src={`http://127.0.0.1:5000${product.qr_url}`} alt="QR" width="100" />
    </div>
  );
}

export default ProductDetails;