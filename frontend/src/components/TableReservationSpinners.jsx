// TableReservationSpinners.jsx
import React from "react";

export const LoadingSpinner = () => (
  <div className="reservation-loading-overlay">
    <div className="reservation-loading-spinner">
      <div className="spinner"></div>
      <p>Processing your reservation...</p>
    </div>
  </div>
);

export const DateLoadingSpinner = () => (
  <div className="date-loading-overlay">
    <div className="date-loading-spinner">
      <div className="spinner-small"></div>
      <p>Loading table availability...</p>
    </div>
  </div>
);

export const FormLoadingSpinner = () => (
  <div className="form-loading-container">
    <div className="form-loading-spinner">
      <div className="spinner"></div>
      <p>Loading reservation form...</p>
    </div>
  </div>
);
