import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Trash2,
  User,
  Calendar,
  Layers,
  Clock,
} from "lucide-react";
import "../Style/ReservationSummary.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";

const ReservationSummary = ({
  orderSummary,
  reservationData,
  paymentMethod,
  setPaymentMethod,
  onReceiptChange, // New prop to notify parent about receipt
}) => {
  const [receipt, setReceipt] = useState(null);
  const fileInputRef = useRef(null);
  const [paymentSettings, setPaymentSettings] = useState({
    gcash_number: "",
    gcash_name: "",
    maya_number: "",
    maya_name: "",
  });

  // Fetch payment settings
  useEffect(() => {
    axios
      .get(`${API_BASE}/settings`)
      .then((res) => setPaymentSettings(res.data))
      .catch((err) => console.error("Could not load payment info"));
  }, []);

  // Notify parent when receipt changes
  useEffect(() => {
    if (onReceiptChange) {
      onReceiptChange(receipt);
    }
  }, [receipt, onReceiptChange]);

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setReceipt(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Improved helper to format table display
  const displayTables = () => {
    const main = reservationData.tableLabel || "";
    const linked =
      reservationData.linkedTables && reservationData.linkedTables.length > 0
        ? ` + ${reservationData.linkedTables.join(", ")}`
        : "";
    return main + linked;
  };

  // Get account details based on payment method
  const getAccountDetails = () => {
    if (paymentMethod === "Gcash") {
      return {
        number: paymentSettings.gcash_number || "Loading...",
        name: paymentSettings.gcash_name || "Loading...",
      };
    } else if (paymentMethod === "Maya") {
      return {
        number: paymentSettings.maya_number || "Loading...",
        name: paymentSettings.maya_name || "Loading...",
      };
    }
    return null;
  };

  const accountDetails = getAccountDetails();

  return (
    <div className="summary-inline-container">
      {/* Customer Profile Section */}
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
        </div>
      </section>

      {/* Booking Schedule Section */}
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
            <label>Duration</label>
            <span className="highlight-text">
              {reservationData.durationHours} hour
              {reservationData.durationHours !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="detail-item">
            <label>Table(s) Selected</label>
            <span className="highlight-text">
              {displayTables() || "No Table Selected"}
            </span>
          </div>
          <div className="detail-item">
            <label>Total Pax</label>
            <span>{reservationData.guestCount} Guests</span>
          </div>
        </div>
      </section>

      {/* Ordered Packages Section */}
      <section className="summary-section">
        <div className="section-title-wrapper">
          <Layers size={16} color="#f38d31" />
          <h3>Ordered Packages</h3>
        </div>
        <div className="packages-summary-list">
          {reservationData.packages?.length > 0 ||
          reservationData.selectedItems?.length > 0 ? (
            (reservationData.packages || reservationData.selectedItems).map(
              (item, index) => (
                <div
                  key={index}
                  className="package-summary-item"
                  style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      fontWeight: "700",
                    }}
                  >
                    <span className="pkg-name">
                      {item.name || item.item_name}
                    </span>
                    <span className="pkg-qty">Qty: {item.quantity}</span>
                  </div>

                  {/* Display Customizations */}
                  {item.customizations && (
                    <div
                      className="customization-details"
                      style={{
                        fontSize: "0.8rem",
                        color: "#666",
                        marginTop: "4px",
                        paddingLeft: "10px",
                        borderLeft: "2px solid #eee",
                      }}
                    >
                      {item.customizations.flavor && (
                        <div>
                          • Flavor:{" "}
                          <span style={{ color: "#333", fontWeight: "600" }}>
                            {item.customizations.flavor}
                          </span>
                        </div>
                      )}
                      {item.customizations.drink && (
                        <div>
                          • Drink:{" "}
                          <span style={{ color: "#333", fontWeight: "600" }}>
                            {item.customizations.drink}
                          </span>
                        </div>
                      )}
                      {item.customizations.spiceLevel && (
                        <div>
                          • Spice:{" "}
                          <span style={{ color: "#333", fontWeight: "600" }}>
                            {item.customizations.spiceLevel}
                          </span>
                        </div>
                      )}
                      {item.customizations.specialInstructions && (
                        <div style={{ fontStyle: "italic" }}>
                          " {item.customizations.specialInstructions} "
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )
          ) : (
            <p className="no-res-text">No packages selected.</p>
          )}
        </div>
      </section>

      {/* Payment Breakdown Section */}
      <section className="summary-section payment-box">
        <div className="section-header">
          <CreditCard size={18} color="#f38d31" />
          <h3 style={{ color: "#333", marginLeft: "8px", marginBottom: "0" }}>
            Payment Breakdown
          </h3>
        </div>

        {/* Duration Info */}
        {reservationData.durationHours && reservationData.durationHours > 0 && (
          <div className="duration-info-summary">
            <Clock size={14} />
            <span>
              Reservation Duration: {reservationData.durationHours} hour
              {reservationData.durationHours !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        <div className="payment-row">
          <span>Total Bill</span>
          <span>
            ₱
            {orderSummary?.totalOrderPrice?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Show duration-based downpayment note if applicable */}
        {reservationData.durationHours >= 2 && (
          <div className="payment-note">
            <small>
              ⚠️ Minimum downpayment for {reservationData.durationHours}{" "}
              hour(s): ₱
              {(() => {
                let min = 200;
                const additional = Math.floor(
                  reservationData.durationHours - 2,
                );
                min += additional * 50;
                return min.toFixed(2);
              })()}
            </small>
          </div>
        )}

        <div className="payment-row highlight">
          <span>Required Downpayment</span>
          <span>
            ₱
            {orderSummary?.downpayment?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="payment-row balance">
          <span>Remaining Balance to Pay</span>
          <span>
            ₱
            {orderSummary?.balance?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <label className="payment-method-label">Select Payment Method</label>
        <div style={{ display: "flex", gap: "12px", marginBottom: "15px" }}>
          {["Gcash", "Maya"].map((method) => (
            <div
              key={method}
              onClick={() => {
                setPaymentMethod(method);
                setReceipt(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className={`payment-card ${paymentMethod === method ? "selected" : ""}`}
              style={{
                flex: 1,
                padding: "15px",
                borderRadius: "12px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
                position: "relative",
                border:
                  paymentMethod === method
                    ? "2px solid #f38d31"
                    : "2px solid #eee",
                backgroundColor: paymentMethod === method ? "#fffcf9" : "#fff",
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

        {paymentMethod && accountDetails && (
          <div className="payment-instructions fade-in">
            <p>
              Send{" "}
              <span style={{ color: "#e63946", fontWeight: "bold" }}>
                {paymentMethod}
              </span>{" "}
              Payment to:
            </p>
            <div className="account-details">
              <strong>{accountDetails.number || "Not Set"}</strong>
              <div className="account-name">
                Account Name: {accountDetails.name || "Not Set"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Receipt Upload - ONLY SHOW AFTER PAYMENT METHOD SELECTED */}
      {paymentMethod && (
        <section className="summary-section">
          <label className="upload-instruction">
            Upload Receipt (Amount: ₱{orderSummary?.downpayment?.toFixed(2)})
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
      )}
    </div>
  );
};

export default ReservationSummary;
