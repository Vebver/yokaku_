import React from "react";
import { Clock, AlertCircle, X } from "lucide-react";
import "../Style/ExistingModal.css";

const ExistingModal = ({ isOpen, onClose, reservationDetails }) => {
  if (!isOpen) return null;

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
          <div className="icon-circle">
            <Clock size={48} />
          </div>
        </div>

        <h2>Ongoing Reservation</h2>

        <p className="existing-modal-message">
          You already have an active reservation. You cannot make a new
          reservation until your current one is completed.
        </p>

        {reservationDetails && (
          <div className="existing-reservation-details">
            <h3>Your Current Reservation:</h3>
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
            OK, I Understand
          </button>
        </div>

        <p className="existing-modal-footer-note">
          Please wait until your current reservation is completed before making
          a new booking.
        </p>
      </div>
    </div>
  );
};

export default ExistingModal;
