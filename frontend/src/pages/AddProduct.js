import React, { useState } from "react";

function AddProduct() {
  const [productName, setProductName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("");
  const [message, setMessage] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("http://127.0.0.1:5000/add_product", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_name: productName, purchase_date: purchaseDate, warranty_period_days: warrantyDays }),
    });
    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div>
      <h2>Add Product</h2>
      <form onSubmit={handleAdd}>
        <input placeholder="Product Name" value={productName} onChange={e => setProductName(e.target.value)} required />
        <input placeholder="Purchase Date (YYYY-MM-DD)" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />
        <input placeholder="Warranty Days" type="number" value={warrantyDays} onChange={e => setWarrantyDays(e.target.value)} required />
        <button type="submit">Add</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default AddProduct;