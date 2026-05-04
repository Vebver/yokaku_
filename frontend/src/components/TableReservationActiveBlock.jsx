// TableReservationActiveBlock.jsx
import React from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";

const ActiveReservationBlock = ({ activeReservationDetails, onClose }) => {
  return (
    <div className="floor-plan-wrapper">
      <button className="page-back-btn" onClick={onClose}>
        <ArrowLeft size={18} /> <span>Back</span>
      </button>
      <div className="active-reservation-block">
        <div className="active-reservation-card">
          <AlertCircle size={48} color="#e63946" />
          <h2>You Have an Ongoing Reservation</h2>
          <p>
            You cannot make a new reservation until your current reservation is
            completed.
          </p>
          <div className="active-reservation-details">
            <p>
              <strong>Reservation ID:</strong>{" "}
              {activeReservationDetails.reservation_id}
            </p>
            <p>
              <strong>Date:</strong> {activeReservationDetails.reservation_date}
            </p>
            <p>
              <strong>Time:</strong> {activeReservationDetails.reservation_time}{" "}
              - {activeReservationDetails.end_time}
            </p>
            <p>
              <strong>Tables:</strong>{" "}
              {activeReservationDetails.assigned_tables}
            </p>
          </div>
          <button className="btn-confirm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveReservationBlock;
