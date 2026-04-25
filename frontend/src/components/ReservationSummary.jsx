import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  CreditCard,
  Trash2,
  User,
  MapPin,
  Calendar,
  Clock,
  Layers,
  Info,
  Mail,
  Phone,
} from "lucide-react";
import "../Style/ReservationSummary.css";

const ReservationSummary = ({
  isOpen,
  onClose,
  orderSummary,
  reservationData,
  onConfirm,
  loading,
}) => {
  const [receipt, setReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // State for Gcash/Maya selection
  const fileInputRef = useRef(null);

  // Auto-manage body scroll and reset file on close
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setReceipt(null);
      setPaymentMethod(null); // Reset selection
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setReceipt(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper to format linked tables display
  const displayTables = () => {
    const main = reservationData.tableLabel || "";
    const linked =
      reservationData.linkedTables?.length > 0
        ? ` + ${reservationData.linkedTables.map((id) => `T${id}`).join(", ")}`
        : "";
    return main + linked;
  };

  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div
        className="summary-modal-content fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="summary-header">
          <div className="header-title-group">
            <div className="icon-badge">
              <ClipboardList size={22} color="white" />
            </div>
            <h2>Review Your Reservation</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <div className="summary-body">
          {/* Section 1: Personal Information */}
          <section className="summary-section">
            <div className="section-title-wrapper">
              <User size={16} color="#f38d31" />
              <h3>Customer Profile</h3>
            </div>
            <div className="detail-grid full-info">
              <div className="detail-item">
                <label>Full Name</label>
                <span>
                  {reservationData.firstName} {reservationData.lastName}
                </span>
              </div>
              <div className="detail-item">
                <label>Contact Number</label>
                <span>{reservationData.phone}</span>
              </div>
              <div className="detail-item full-width">
                <label>Email Address</label>
                <span>{reservationData.email}</span>
              </div>
              <div className="detail-item full-width">
                <label>Home Address</label>
                <span>
                  Brgy. {reservationData.barangay},{" "}
                  {reservationData.municipality}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Reservation Logistics */}
          <section className="summary-section">
            <div className="section-title-wrapper">
              <Calendar size={16} color="#f38d31" />
              <h3>Booking Schedule</h3>
            </div>
            <div className="detail-grid full-info">
              <div className="detail-item">
                <label>Reservation Date</label>
                <span>{reservationData.resDate}</span>
              </div>
              <div className="detail-item">
                <label>Time Slot</label>
                <span>
                  {reservationData.startTime} - {reservationData.endTime}
                </span>
              </div>
              <div className="detail-item">
                <label>Table(s) Selected</label>
                <span className="highlight-text">{displayTables()}</span>
              </div>
              <div className="detail-item">
                <label>Total Pax</label>
                <span>{reservationData.guestCount} Guests</span>
              </div>
              <div className="detail-item full-width">
                <label>Allergy / Health Notes</label>
                <span
                  className={
                    reservationData.allergy !== "No Allergy"
                      ? "allergy-active"
                      : ""
                  }
                >
                  {reservationData.allergy}
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Packages Selected */}
          <section className="summary-section">
            <div className="section-title-wrapper">
              <Layers size={16} color="#f38d31" />
              <h3>Ordered Packages</h3>
            </div>
            <div className="packages-summary-list">
              {reservationData.packages?.map((item, index) => (
                <div key={index} className="package-summary-item">
                  <span className="pkg-name">{item.name}</span>
                  <span className="pkg-qty">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Payment Details */}
          <section className="summary-section payment-box">
            <div className="section-header">
              <CreditCard size={18} color="#f38d31" />
              <h3
                style={{ color: "#333", marginLeft: "8px", marginBottom: "0" }}
              >
                Payment Breakdown
              </h3>
            </div>

            <div className="payment-row">
              <span>Total Bill</span>
              <span>₱{orderSummary?.totalOrderPrice?.toFixed(2)}</span>
            </div>
            <div className="payment-row highlight">
              <span>Required Downpayment (20%)</span>
              <span>₱{orderSummary?.downpayment?.toFixed(2)}</span>
            </div>
            <div className="payment-row balance">
              <span>Remaining Balance to Pay</span>
              <span>₱{orderSummary?.balance?.toFixed(2)}</span>
            </div>

            {/* MODERN PAYMENT SELECTION CARDS */}
            <label
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#888",
                display: "block",
                marginTop: "20px",
                marginBottom: "10px",
                textTransform: "uppercase",
              }}
            >
              Select Payment Method
            </label>
            <div style={{ display: "flex", gap: "12px", marginBottom: "15px" }}>
              {["Gcash", "Maya"].map((method) => (
                <div
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={{
                    flex: 1,
                    padding: "15px",
                    borderRadius: "12px",
                    border:
                      paymentMethod === method
                        ? "2px solid #f38d31"
                        : "2px solid #eee",
                    backgroundColor:
                      paymentMethod === method ? "#fffcf9" : "#fff",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                    position: "relative",
                    boxShadow:
                      paymentMethod === method
                        ? "0 4px 12px rgba(243, 141, 49, 0.1)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "700",
                      color: paymentMethod === method ? "#f38d31" : "#555",
                      fontSize: "15px",
                    }}
                  >
                    {method}
                  </span>
                  {paymentMethod === method && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                      }}
                    >
                      <CheckCircle2 size={18} color="#f38d31" fill="white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CONDITIONAL PAYMENT INSTRUCTIONS */}
            {paymentMethod && (
              <div
                className="fade-in"
                style={{
                  backgroundColor: "#e8f5e9",
                  padding: "15px",
                  borderRadius: "10px",
                  border: "1px solid #c8e6c9",
                  fontSize: "14px",
                }}
              >
                <p style={{ margin: 0, fontWeight: "600", color: "#2e7d32" }}>
                  Send <span style={{ color: "red" }}>{paymentMethod}</span>{" "}
                  Payment to:
                </p>
                <div style={{ color: "#2e7d32", marginTop: "6px" }}>
                  <strong style={{ fontSize: "16px" }}>09060052831</strong>
                  <div style={{ fontSize: "13px", opacity: 0.8 }}>
                    Account Name: Carl Lorenz Leabres
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section 5: Receipt Upload */}
          <section className="summary-section">
            <label className="upload-instruction">
              Upload <span style={{ color: "red" }}>Gcash</span> /
              <span style={{ color: "red" }}> Maya</span> Receipt (Amount: ₱
              {orderSummary?.downpayment?.toFixed(2)})
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setReceipt(e.target.files[0])}
              accept="image/*"
              style={{ display: "none" }}
            />
            <div className="upload-container-wrapper">
              <button
                type="button"
                className={`upload-btn ${receipt ? "file-selected" : ""}`}
                onClick={() => fileInputRef.current.click()}
              >
                {receipt ? (
                  <div className="selected-file-info">
                    <CheckCircle2 size={18} color="#27ae60" />
                    <span className="file-name">{receipt.name}</span>
                  </div>
                ) : (
                  <div className="placeholder-info">
                    <Upload size={18} />
                    <span>Select Receipt Image</span>
                  </div>
                )}
              </button>
              {receipt && (
                <button
                  type="button"
                  className="remove-file-action"
                  onClick={handleRemoveFile}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            {!receipt && (
              <div className="upload-tip">
                <AlertCircle size={14} />
                <span>Payment screenshot is required to complete booking.</span>
              </div>
            )}
          </section>
        </div>

        <footer className="summary-footer">
          <button
            className="confirm-btn"
            disabled={!receipt || !paymentMethod || loading} // Also disable if no method selected
            onClick={() => onConfirm(receipt)}
          >
            {loading ? "Processing..." : "Submit Reservation"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ReservationSummary;
