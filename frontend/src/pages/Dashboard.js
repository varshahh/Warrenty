import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Dashboard() {

  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [previewBill, setPreviewBill] = useState(null);

  useEffect(() => {

    const fetchProducts = async () => {

      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("Please login first!");
        return;
      }

      try {

        const res = await fetch("http://192.168.1.4:5000/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {

          const data = await res.json();

          setProducts(data);

        } else {

          setMessage("Failed to fetch products");

        }

      } catch (error) {

        console.error(error);
        setMessage("Server error");

      }

    };

    fetchProducts();

  }, []);


  const getBadgeColor = (status) => {

    if (status === "Active") return "#28a745";

    if (status === "Expiring Soon") return "#ffc107";

    if (status === "Expired") return "#dc3545";

    return "#6c757d";

  };


  const filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );


  const expiringProducts = products.filter(
    (p) => p.days_remaining <= 5 && p.days_remaining > 0
  );


  return (

    <div
      style={{
        padding: "40px",
        fontFamily: "'Poppins', sans-serif",
        minHeight: "100vh",
        background: "linear-gradient(to right,#f5f7fa,#c3cfe2)"
      }}
    >

      {/* Expiring Alert */}
      {expiringProducts.length > 0 && (

        <div
          style={{
            background: "#ffc107",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "25px",
            fontWeight: "bold",
            textAlign: "center"
          }}
        >
          ⚠ {expiringProducts.length} product(s) warranty expiring within 5 days!
        </div>

      )}

      {/* Header */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px"
        }}
      >

        <h1 style={{ fontSize: "32px", color: "#333" }}>
          📦 Warranty Dashboard
        </h1>

        <Link
          to="/upload-bill"
          style={{
            padding: "10px 20px",
            background: "#764ba2",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
          }}
        >
          Upload Bill
        </Link>

      </div>


      {/* Search */}

      <input
        type="text"
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "12px",
          width: "100%",
          maxWidth: "400px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginBottom: "30px"
        }}
      />


      {message && <p style={{ color: "red" }}>{message}</p>}


      {/* Product Cards */}

      {filteredProducts.length > 0 ? (

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: "25px"
          }}
        >

          {filteredProducts.map((p) => {

            const progress = Math.max(
              0,
              Math.min(100, (p.days_remaining / 365) * 100)
            );

            return (

              <div
                key={p.product_id}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "22px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  transition: "0.3s"
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-6px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >

                {/* Product Name */}

                <h2>

                  <Link
                    to={`/product/${p.product_id}`}
                    style={{
                      textDecoration: "none",
                      color: "#333"
                    }}
                  >
                    {p.product_name}
                  </Link>

                </h2>

                <p><b>Purchase:</b> {p.purchase_date}</p>
                <p><b>Expiry:</b> {p.expiry_date}</p>
                <p><b>Days Remaining:</b> {p.days_remaining}</p>


                {/* Status Badge */}

                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    color: "#fff",
                    fontWeight: "bold",
                    backgroundColor: getBadgeColor(p.status),
                    marginTop: "5px"
                  }}
                >
                  {p.status}
                </div>


                {/* Progress Bar */}

                <div
                  style={{
                    background: "#eee",
                    height: "10px",
                    borderRadius: "10px",
                    marginTop: "15px",
                    overflow: "hidden"
                  }}
                >

                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background:
                        p.status === "Expired"
                          ? "#dc3545"
                          : p.status === "Expiring Soon"
                          ? "#ffc107"
                          : "#28a745",
                      transition: "0.5s"
                    }}
                  ></div>

                </div>


                {/* Buttons */}

                <div style={{ marginTop: "15px" }}>

                  {p.bill_url && (

                    <button
                      onClick={() =>
                        setPreviewBill(`http://192.168.1.4:5000${p.bill_url}`)
                      }
                      style={{
                        padding: "6px 12px",
                        border: "none",
                        background: "#17a2b8",
                        color: "#fff",
                        borderRadius: "6px",
                        cursor: "pointer",
                        marginRight: "10px"
                      }}
                    >
                      View Bill
                    </button>

                  )}

                </div>


                {/* QR Code */}

                <div style={{ marginTop: "20px", textAlign: "center" }}>

                  <img
                    src={`http://192.168.1.4:5000${p.qr_url}`}
                    alt="QR"
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "6px",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                    }}
                  />

                  <br />

                  <a
                    href={`http://192.168.1.4:5000${p.qr_url}`}
                    download
                    style={{
                      display: "inline-block",
                      marginTop: "10px",
                      padding: "6px 14px",
                      background: "#4facfe",
                      color: "#fff",
                      borderRadius: "6px",
                      fontSize: "14px",
                      textDecoration: "none",
                      fontWeight: "bold"
                    }}
                  >
                    Download QR
                  </a>

                </div>

              </div>

            );

          })}

        </div>

      ) : (

        <div
          style={{
            background: "#fff",
            padding: "40px",
            borderRadius: "10px",
            textAlign: "center"
          }}
        >

          <h3>No products found</h3>

          <p>Upload a bill to add your first product.</p>

        </div>

      )}


      {/* Bill Preview Modal */}

      {previewBill && (

        <div
          onClick={() => setPreviewBill(null)}
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
            src={previewBill}
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

export default Dashboard;