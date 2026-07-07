// FileARefund.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext";
import axios from "axios";
import "../Style/FileARefund.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";

const FileARefund = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { reservationId, reason, reservationType } = location.state || {};

  const [subject, setSubject] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (reason) {
      setSubject(
        `Refund Request for ${reservationId || "Reservation"} - ${reason}`,
      );
    }

    const email = localStorage.getItem("email");
    if (email) {
      setUserEmail(email);
    }
  }, [reason, reservationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject || !comment) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        showToast(
          "You need to be logged in to submit a refund request.",
          "error",
        );
        setLoading(false);
        return;
      }

      console.log("📤 Sending refund request:", {
        reservationId,
        subject,
        comment,
        email: userEmail,
        reason: reason,
        reservationType: reservationType,
      });

      const response = await axios.post(
        `${API_BASE}/refund/request`,
        {
          reservationId,
          subject,
          comment,
          email: userEmail,
          reason: reason,
          reservationType: reservationType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("✅ Refund response:", response.data);
      showToast(
        response.data.message || "Refund request submitted successfully!",
        "success",
      );
      navigate("/my-reservation");
    } catch (error) {
      console.error("❌ Refund request error:", error);
      console.error("📋 Error response:", error.response?.data);
      console.error("📋 Error status:", error.response?.status);

      // Show more specific error messages
      let errorMessage = "Failed to submit refund request.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="refund-page-container">
      <div className="refund-form-wrapper">
        <h2 className="refund-title">File a Refund</h2>
        <p className="refund-subtitle">
          Please provide details about your refund request. We'll review it and
          get back to you within 24-48 hours.
        </p>

        <form onSubmit={handleSubmit} className="refund-form">
          <div className="refund-form-group">
            <label htmlFor="reservationId">Reservation ID</label>
            <input
              type="text"
              id="reservationId"
              className="refund-input"
              value={reservationId || "N/A"}
              disabled
            />
          </div>

          <div className="refund-form-group">
            <label htmlFor="reservationType">Reservation Type</label>
            <input
              type="text"
              id="reservationType"
              className="refund-input"
              value={reservationType || "N/A"}
              disabled
            />
          </div>

          <div className="refund-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="refund-input"
              value={userEmail || "Not logged in"}
              disabled
            />
          </div>

          <div className="refund-form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              className="refund-input"
              placeholder="Refund request subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="refund-form-group">
            <label htmlFor="comment">Comment / Details</label>
            <textarea
              id="comment"
              className="refund-textarea"
              placeholder="Please provide details about why you're requesting a refund..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="6"
              required
            />
          </div>

          <div className="refund-form-actions">
            <button
              type="button"
              className="refund-cancel-btn"
              onClick={() => navigate("/my-reservation")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="refund-submit-btn"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Refund Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileARefund;
