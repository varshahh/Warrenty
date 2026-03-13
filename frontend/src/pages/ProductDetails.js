import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [preview, setPreview] = useState(null); // Bill preview overlay
  const [billFile, setBillFile] = useState(null); // New bill file
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [qrPreview, setQrPreview] = useState(null); // QR overlay

  // ---------------- FETCH PRODUCT ----------------
  const fetchProduct = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:5000/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setProduct({
          product_name: data.product_name || data.name,
          purchase_date: data.purchase_date,
          warranty_days: data.warranty_days || data.warranty_period,
          expiry_date: data.expiry_date,
          status: data.status,
          days_remaining: data.days_remaining,
          bill_url: data.bill_url,
          qr_url: data.qr_url,
        });
      } else {
        alert(data.message || "Failed to fetch product");
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      alert("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  // ---------------- DELETE PRODUCT ----------------
  const deleteProduct = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/delete_product/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert("Product deleted successfully");
        navigate("/dashboard");
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Server error during deletion");
    }
  };

  // ---------------- UPLOAD NEW BILL ----------------
  const handleBillUpload = async () => {
    if (!billFile) {
      alert("Please select a bill file to upload!");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("bill", billFile);
    formData.append("product_id", id); // ensure backend knows which product

    try {
      setUploading(true);
      const res = await axios.post("http://127.0.0.1:5000/upload_bill", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert(res.data.message || "Bill uploaded successfully!");
      setBillFile(null);
      fetchProduct(); // refresh product details
    } catch (err) {
      console.error(err.response || err);
      alert("Failed to upload bill. Check console.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <h2 style={{ textAlign: "center", marginTop: "80px" }}>Loading Product Details...</h2>;
  if (!product) return <h2 style={{ textAlign: "center", marginTop: "80px" }}>Product not found</h2>;

  // ---------------- BADGE & PROGRESS ----------------
  let badgeGradient = "linear-gradient(135deg,#555,#777)";
  if (product.status === "Active") badgeGradient = "linear-gradient(135deg,#28a745,#2ecc71)";
  if (product.status === "Expiring Soon") badgeGradient = "linear-gradient(135deg,#ffc107,#ffb347)";
  if (product.status === "Expired") badgeGradient = "linear-gradient(135deg,#dc3545,#e74c3c)";
  const progress = Math.max(0, Math.min(100, (product.days_remaining / 365) * 100));

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(to right,#f5f7fa,#c3cfe2)", padding: "40px", fontFamily: "Poppins, sans-serif" }}>
      <div style={{ maxWidth: "520px", margin: "auto", padding: "35px", borderRadius: "16px", boxShadow: "0 12px 30px rgba(0,0,0,0.2)", textAlign: "center", background: "#fff" }}>
        <h1>📄 Warranty Details</h1>
        <h2>{product.product_name}</h2>

        <div style={{ marginBottom: "20px" }}>
          <Link to={`/edit-product/${id}`} style={{ padding: "8px 18px", background: "#764ba2", color: "#fff", borderRadius: "6px", textDecoration: "none", marginRight: "10px", fontWeight:"bold" }}>Edit Product</Link>
          <button onClick={() => setShowDeleteModal(true)} style={{ padding: "8px 18px", background: "#dc3545", color: "#fff", border: "none", borderRadius: "6px", fontWeight:"bold", cursor: "pointer" }}>Delete Product</button>
        </div>

        <p><b>Purchase Date:</b> {product.purchase_date}</p>
        <p><b>Expiry Date:</b> {product.expiry_date}</p>
        <p><b>Days Remaining:</b> <span style={{ color: product.days_remaining <=5 ? "#dc3545" : "#28a745", fontWeight:"bold" }}>{product.days_remaining}</span></p>

        <div style={{ display:"inline-block", padding:"10px 25px", borderRadius:"25px", background: badgeGradient, color:"#fff", fontWeight:"bold", marginTop:"10px" }}>{product.status}</div>

        <div style={{ marginTop:"25px", background:"#eee", height:"10px", borderRadius:"10px", overflow:"hidden" }}>
          <div style={{ width:`${progress}%`, height:"100%", background: product.status === "Expired" ? "#dc3545" : product.status === "Expiring Soon" ? "#ffc107" : "#28a745" }} />
        </div>

        {/* ---------------- BILL IMAGE ---------------- */}
        {product.bill_url && (
          <div style={{ marginTop:"35px" }}>
            <h3>🧾 Bill Image</h3>
            <img src={`http://127.0.0.1:5000${product.bill_url}`} alt="Bill" style={{ width:"100%", borderRadius:"12px", cursor:"pointer" }} onClick={() => setPreview(`http://127.0.0.1:5000${product.bill_url}`)} />
            <br /><br />
            <a href={`http://127.0.0.1:5000${product.bill_url}`} download={`${product.product_name}_bill.png`} style={{ padding:"8px 16px", background:"#4facfe", color:"#fff", borderRadius:"6px", textDecoration:"none", marginRight:"10px" }}>Download Bill</a>
            <button onClick={() => navigator.clipboard.writeText(`http://127.0.0.1:5000${product.bill_url}`).then(()=>alert("Bill link copied!"))} style={{ padding:"8px 16px", background:"#28a745", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer" }}>Share Bill</button>
          </div>
        )}

        {/* ---------------- UPLOAD NEW BILL ---------------- */}
        <div style={{ marginTop:"35px" }}>
          <h3>⬆️ Upload New Bill</h3>
          <input type="file" accept="image/*" onChange={(e)=>setBillFile(e.target.files[0])} disabled={uploading} />
          <button onClick={handleBillUpload} disabled={uploading} style={{ marginLeft:"10px", padding:"8px 16px", background:"#28a745", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer" }}>{uploading ? "Uploading..." : "Upload Bill"}</button>
        </div>

        {/* ---------------- QR CODE ---------------- */}
        {product.qr_url && (
          <div style={{ marginTop:"35px" }}>
            <h3>📱 Product QR Code</h3>
            <img src={`http://127.0.0.1:5000${product.qr_url}`} alt="QR" style={{ width:"120px", cursor:"pointer" }} onClick={() => setQrPreview(`http://127.0.0.1:5000${product.qr_url}`)} />
            <br />
            <a href={`http://127.0.0.1:5000${product.qr_url}`} download={`${product.product_name}_qr.png`} style={{ padding:"6px 12px", background:"#28a745", color:"#fff", borderRadius:"6px", textDecoration:"none", marginTop:"10px", display:"inline-block" }}>Download QR</a>
          </div>
        )}
      </div>

      {/* BILL PREVIEW MODAL */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.7)", display:"flex", justifyContent:"center", alignItems:"center" }}>
          <img src={preview} alt="Bill" style={{ maxWidth:"80%", maxHeight:"80%", borderRadius:"10px" }} />
        </div>
      )}

      {/* QR PREVIEW MODAL */}
      {qrPreview && (
        <div onClick={() => setQrPreview(null)} style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.7)", display:"flex", justifyContent:"center", alignItems:"center" }}>
          <img src={qrPreview} alt="QR Code" style={{ maxWidth:"50%", maxHeight:"50%", borderRadius:"10px" }} />
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.6)", display:"flex", justifyContent:"center", alignItems:"center" }}>
          <div style={{ background:"#fff", padding:"30px", borderRadius:"12px", textAlign:"center", width:"320px" }}>
            <h3>Delete Product?</h3>
            <p>This action cannot be undone.</p>
            <button onClick={deleteProduct} style={{ padding:"8px 16px", background:"#dc3545", color:"#fff", border:"none", borderRadius:"6px", marginRight:"10px", cursor:"pointer" }}>Delete</button>
            <button onClick={() => setShowDeleteModal(false)} style={{ padding:"8px 16px", background:"#ccc", border:"none", borderRadius:"6px", cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetails;