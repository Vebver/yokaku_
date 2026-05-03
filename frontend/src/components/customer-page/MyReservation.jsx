import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Eye,
  X,
  AlertCircle,
  Edit,
} from "lucide-react";
import TermsModal from "../TermsModal";
import "../../Style/MyReservation.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";

const MyReservation = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsFromCancel, setShowTermsFromCancel] = useState(false);

  const cancelReasons = [
    "Change of plans",
    "Schedule conflict",
    "Found better option",
    "Emergency",
    "Weather conditions",
    "Transportation issues",
    "Health concerns",
    "Other",
  ];

  useEffect(() => {
    fetchUserReservations();
  }, []);

  const fetchUserReservations = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!userId) {
        console.error("No user ID found");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE}/reservations/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Safely extract array from response
      let reservationsArray = [];
      if (Array.isArray(response.data)) {
        reservationsArray = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        reservationsArray = response.data.data;
      } else if (response.data && Array.isArray(response.data.reservations)) {
        reservationsArray = response.data.reservations;
      } else if (response.data && typeof response.data === "object") {
        // If it's a single object, wrap it in an array
        if (response.data.reservation_id) {
          reservationsArray = [response.data];
        }
      }

      setReservations(reservationsArray);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (reservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedReservation(null);
  };

  const handleUpdateReservation = () => {
    console.log("Update reservation:", selectedReservation);
    alert("Update reservation functionality coming soon!");
  };

  const handleCancelClick = () => {
    setCancelReason("");
    setCancelReasonText("");
    setSelectedCancelReason("");
    setAgreeToTerms(false);
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelReason("");
    setCancelReasonText("");
    setSelectedCancelReason("");
    setAgreeToTerms(false);
  };

  const handleOpenTermsModal = () => {
    setShowTermsFromCancel(true);
    setShowTermsModal(true);
  };

  const handleCloseTermsModal = () => {
    setShowTermsModal(false);
    setShowTermsFromCancel(false);
  };

  const handleAcceptTerms = () => {
    setAgreeToTerms(true);
    setShowTermsModal(false);
    setShowTermsFromCancel(false);
  };

  // Check if confirm button should be disabled
  const isConfirmDisabled = () => {
    const finalReason =
      cancelReason === "Other" ? cancelReasonText : cancelReason;
    if (!finalReason) return true;
    if (!agreeToTerms) return true;
    if (cancelReason === "Other" && !cancelReasonText.trim()) return true;
    return false;
  };

  const handleConfirmCancellation = () => {
    if (isConfirmDisabled()) return;

    const finalReason =
      cancelReason === "Other" ? cancelReasonText : cancelReason;
    handleProceedToCancellation(finalReason);
  };

  const handleProceedToCancellation = async (finalReason) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/reservations/${selectedReservation.reservation_id}/status`,
        {
          status: "Cancelled",
          cancellation_reason: finalReason,
          cancelled_at: new Date().toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert(`Reservation cancelled successfully.\nReason: ${finalReason}`);

      await fetchUserReservations();
      handleCloseCancelModal();
      closeModal();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      alert("Failed to cancel reservation. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return "";
    if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;

    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "status-confirmed";
      case "pending":
        return "status-pending";
      case "seated":
        return "status-seated";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="my-reservation-page">
        <div className="my-reservation-container">
          <div className="my-reservation-header">
            <h1>My Reservations</h1>
            <p>View and manage your upcoming table reservations</p>
          </div>

          <div className="reservations-list">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading your reservations...</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="empty-state">
                <Calendar size={64} />
                <h3>No Active Reservations</h3>
                <p>You don't have any upcoming reservations.</p>
                <button
                  className="reserve-now-btn"
                  onClick={() => (window.location.href = "/tablereservation")}
                >
                  Reserve a Table
                </button>
              </div>
            ) : (
              reservations.map((reservation) => (
                <div
                  key={reservation.reservation_id}
                  className="reservation-card"
                >
                  <div className="reservation-card-header">
                    <div className="reservation-id">
                      <span className="id-label">Reservation ID:</span>
                      <span className="id-value">
                        {reservation.reservation_id}
                      </span>
                    </div>
                    <div
                      className={`status-badge ${getStatusBadgeClass(reservation.status)}`}
                    >
                      {reservation.status}
                    </div>
                  </div>

                  <div className="reservation-card-body">
                    <div className="reservation-info-row">
                      <div className="info-item">
                        <Calendar size={16} />
                        <span>{formatDate(reservation.reservation_date)}</span>
                      </div>
                      <div className="info-item">
                        <Clock size={16} />
                        <span>
                          {formatTimeDisplay(reservation.reservation_time)} -{" "}
                          {formatTimeDisplay(reservation.end_time)}
                        </span>
                      </div>
                      <div className="info-item">
                        <Users size={16} />
                        <span>
                          {reservation.num_guests}{" "}
                          {reservation.num_guests === 1 ? "Guest" : "Guests"}
                        </span>
                      </div>
                    </div>

                    {reservation.assigned_tables && (
                      <div className="reservation-tables">
                        <span className="tables-label">Tables:</span>
                        <span className="tables-value">
                          {reservation.assigned_tables}
                        </span>
                      </div>
                    )}

                    {reservation.package_name &&
                      reservation.package_name !== "Table Reservation" && (
                        <div className="reservation-package">
                          <span className="package-label">Package:</span>
                          <span className="package-value">
                            {reservation.package_name}
                          </span>
                        </div>
                      )}
                  </div>

                  <div className="reservation-card-footer">
                    <button
                      className="view-details-btn"
                      onClick={() => handleViewDetails(reservation)}
                    >
                      <Eye size={16} />
                      View Reservation Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reservation Detail Modal */}
        {showDetailModal && selectedReservation && (
          <div className="reservation-modal-overlay" onClick={closeModal}>
            <div
              className="reservation-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="reservation-modal-header">
                <h2>Reservation Details</h2>
                <button className="modal-close-btn" onClick={closeModal}>
                  <X size={24} />
                </button>
              </div>

              <div className="reservation-modal-body">
                <div className="detail-section">
                  <div className="detail-row">
                    <span className="detail-label">Reservation ID:</span>
                    <span className="detail-value">
                      {selectedReservation.reservation_id}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span
                      className={`detail-status-badge ${getStatusBadgeClass(selectedReservation.status)}`}
                    >
                      {selectedReservation.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">
                      {formatDate(selectedReservation.reservation_date)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">
                      {formatTimeDisplay(selectedReservation.reservation_time)}{" "}
                      - {formatTimeDisplay(selectedReservation.end_time)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Number of Guests:</span>
                    <span className="detail-value">
                      {selectedReservation.num_guests}
                    </span>
                  </div>

                  {selectedReservation.assigned_tables && (
                    <div className="detail-row">
                      <span className="detail-label">Assigned Tables:</span>
                      <span className="detail-value">
                        {selectedReservation.assigned_tables}
                      </span>
                    </div>
                  )}

                  {selectedReservation.package_name &&
                    selectedReservation.package_name !==
                      "Table Reservation" && (
                      <div className="detail-row">
                        <span className="detail-label">Package:</span>
                        <span className="detail-value">
                          {selectedReservation.package_name}
                        </span>
                      </div>
                    )}

                  {selectedReservation.allergy &&
                    selectedReservation.allergy !== "None" && (
                      <div className="detail-row">
                        <span className="detail-label">Allergies:</span>
                        <span className="detail-value">
                          {selectedReservation.allergy}
                        </span>
                      </div>
                    )}

                  {selectedReservation.occasion &&
                    selectedReservation.occasion !== "Casual Dining" && (
                      <div className="detail-row">
                        <span className="detail-label">Occasion:</span>
                        <span className="detail-value">
                          {selectedReservation.occasion}
                        </span>
                      </div>
                    )}

                  {selectedReservation.highChair && (
                    <div className="detail-row">
                      <span className="detail-label">High Chair:</span>
                      <span className="detail-value">
                        {selectedReservation.highChair}
                      </span>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="detail-label">Full Address:</span>
                    <span className="detail-value">
                      {selectedReservation.full_address || "Not specified"}
                    </span>
                  </div>
                </div>

                <div className="modal-divider"></div>

                <div className="payment-section">
                  <h3>Payment Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Total Amount:</span>
                    <span className="detail-value">
                      ₱{selectedReservation.amount || 0}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Payment Status:</span>
                    <span className="detail-value">
                      {selectedReservation.payment_status || "Pending"}
                    </span>
                  </div>
                  {selectedReservation.payment_method && (
                    <div className="detail-row">
                      <span className="detail-label">Payment Method:</span>
                      <span className="detail-value">
                        {selectedReservation.payment_method}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="reservation-modal-footer">
                <button
                  className="cancel-reservation-btn"
                  onClick={handleCancelClick}
                >
                  <AlertCircle size={16} />
                  Cancel Reservation
                </button>
                <button
                  className="update-reservation-btn"
                  onClick={handleUpdateReservation}
                >
                  <Edit size={16} />
                  Update Reservation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Reason Modal */}
        {showCancelModal && (
          <div
            className="cancel-modal-overlay"
            onClick={handleCloseCancelModal}
          >
            <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cancel-modal-header">
                <h3>Cancel Reservation</h3>
                <button
                  className="cancel-modal-close"
                  onClick={handleCloseCancelModal}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="cancel-modal-body">
                <p className="cancel-modal-message">
                  Please tell us why you're cancelling this reservation. This
                  helps us improve our service.
                </p>

                <div className="cancel-reasons-list">
                  {cancelReasons.map((reason) => (
                    <label key={reason} className="cancel-reason-item">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={selectedCancelReason === reason}
                        onChange={(e) => {
                          setSelectedCancelReason(e.target.value);
                          setCancelReason(e.target.value);
                          if (e.target.value !== "Other") {
                            setCancelReasonText("");
                          }
                        }}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {cancelReason === "Other" && (
                  <div className="cancel-other-input">
                    <label>Please specify:</label>
                    <textarea
                      className="cancel-reason-textarea"
                      placeholder="Enter your reason here..."
                      value={cancelReasonText}
                      onChange={(e) => setCancelReasonText(e.target.value)}
                      rows="3"
                    />
                  </div>
                )}

                <div className="cancel-terms-checkbox">
                  <label className="terms-checkbox-label">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                    />
                    <span>
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        className="terms-link"
                        onClick={handleOpenTermsModal}
                      >
                        Terms and Conditions
                      </button>
                    </span>
                  </label>
                </div>

                <div className="cancel-warning">
                  <AlertCircle size={16} />
                  <span>
                    This action cannot be undone. Your table will be released
                    for other customers.
                  </span>
                </div>
              </div>

              <div className="cancel-modal-footer">
                <button
                  className="cancel-modal-back-btn"
                  onClick={handleCloseCancelModal}
                >
                  Go Back
                </button>
                <button
                  className={`cancel-modal-confirm-btn ${isConfirmDisabled() ? "disabled" : ""}`}
                  onClick={handleConfirmCancellation}
                  disabled={isConfirmDisabled()}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Terms Modal */}
        <TermsModal
          isOpen={showTermsModal}
          onClose={handleCloseTermsModal}
          onAccept={handleAcceptTerms}
        />
      </div>
    </>
  );
};

export default MyReservation;
