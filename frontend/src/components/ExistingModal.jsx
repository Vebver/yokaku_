import React from "react";
import { Clock, AlertCircle, X } from "lucide-react";
import "../Style/ExistingModal.css";

const ExistingModal = ({ isOpen, onClose, reservationDetails }) => {
  if (!isOpen) return null;

  // Check if this is a rejected payment issue
  const isRejectedPayment = reservationDetails?.payment_status === "rejected";

  return (
    <div className="existing-modal-overlay" onClick={onClose}>
      <div
        className="existing-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="existing-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="existing-modal-icon">
          <div className={`icon-circle ${isRejectedPayment ? "rejected" : ""}`}>
            {isRejectedPayment ? (
              <AlertCircle size={48} />
            ) : (
              <Clock size={48} />
            )}
          </div>
        </div>

        <h2>
          {isRejectedPayment
            ? "Payment Proof Rejected"
            : "Ongoing Reservation"}
        </h2>

        <p className="existing-modal-message">
          {isRejectedPayment
            ? "Your payment proof was rejected. Please re-upload a clear receipt image before making a new reservation."
            : "You already have an active reservation. You cannot make a new reservation until your current one is completed."}
        </p>

        {reservationDetails && (
          <div className="existing-reservation-details">
            <h3>
              {isRejectedPayment
                ? "Reservation with Rejected Payment:"
                : "Your Current Reservation:"}
            </h3>
            <div className="detail-row">
              <span className="detail-label">Reservation ID:</span>
              <span className="detail-value">
                {reservationDetails.reservation_id}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">
                {reservationDetails.reservation_date}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Time:</span>
              <span className="detail-value">
                {reservationDetails.reservation_time} -{" "}
                {reservationDetails.end_time}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Guests:</span>
              <span className="detail-value">
                {reservationDetails.num_guests}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value status-badge">
                {reservationDetails.status}
              </span>
            </div>
            {isRejectedPayment && reservationDetails.rejection_reason && (
              <div className="detail-row rejection-reason">
                <span className="detail-label">Rejection Reason:</span>
                <span className="detail-value error-text">
                  {reservationDetails.rejection_reason}
                </span>
              </div>
            )}
            {reservationDetails.assigned_tables && (
              <div className="detail-row">
                <span className="detail-label">Tables:</span>
                <span className="detail-value">
                  {reservationDetails.assigned_tables}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="existing-modal-actions">
          <button className="existing-modal-btn primary" onClick={onClose}>
            {isRejectedPayment ? "Go to My Reservations" : "Confirm"}
          </button>
        </div>

        <p className="existing-modal-footer-note">
          {isRejectedPayment
            ? "Visit the Notifications page or My Reservations to re-upload your payment proof."
            : "Please wait until your current reservation is completed before making a new booking."}
        </p>
      </div>
    </div>
  );
};

export default ExistingModal;
