import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Eye,
  X,
  AlertCircle,
  Upload,
  History,
  XCircle,
  CheckCircle,
  RefreshCw,
  TriangleAlert,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import TermsModal from "../TermsModal";
import "../../Style/MyReservation.css";
import { useToast } from "../ToastContext";

const API_BASE = "https://yokaku-backend.onrender.com/api";

const MyReservation = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [historyReservations, setHistoryReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsFromCancel, setShowTermsFromCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [showAllHistory, setShowAllHistory] = useState(false);

  // New states for re-uploading payment proof
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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
    fetchUserHistory();
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

      let reservationsArray = [];
      if (Array.isArray(response.data)) {
        reservationsArray = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        reservationsArray = response.data.data;
      } else if (response.data && Array.isArray(response.data.reservations)) {
        reservationsArray = response.data.reservations;
      } else if (response.data && typeof response.data === "object") {
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

  const fetchUserHistory = async () => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!userId) {
        console.error("No user ID found");
        setHistoryLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE}/reservations/user/${userId}/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      let allReservations = [];
      if (Array.isArray(response.data)) {
        allReservations = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        allReservations = response.data.data;
      } else if (response.data && Array.isArray(response.data.reservations)) {
        allReservations = response.data.reservations;
      }

      const historyStatuses = ["cancelled", "completed", "refunded"];
      const history = allReservations.filter((res) => {
        const status = res.status?.toLowerCase() || "";
        return historyStatuses.includes(status);
      });

      setHistoryReservations(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryReservations([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ===== Filtered history based on selected filter =====
  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") {
      return historyReservations;
    }
    return historyReservations.filter((res) => {
      const status = res.status?.toLowerCase() || "";
      return status === historyFilter;
    });
  }, [historyReservations, historyFilter]);

  // ===== Display limited to 5 unless "Show All" is clicked =====
  const displayedHistory = useMemo(() => {
    if (showAllHistory) {
      return filteredHistory;
    }
    return filteredHistory.slice(0, 5);
  }, [filteredHistory, showAllHistory]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_BASE}/billing/reupload-proof/${selectedReservation.reservation_id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      showToast(
        "New proof of payment uploaded. Admin will review your transaction shortly.",
        "success",
      );

      await fetchUserReservations();
      handleCloseCancelModal();
      closeModal();
    } catch (error) {
      console.error("Error re-uploading proof:", error);
      showToast(
        "Failed to submit receipt. Please check file properties and try again.",
      );
    } finally {
      setUploading(false);
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

  const isConfirmDisabled = () => {
    const finalReason =
      cancelReason === "Other" ? cancelReasonText : cancelReason;
    if (!finalReason) return true;
    if (!agreeToTerms) return true;
    if (cancelReason === "Other" && !cancelReasonText.trim()) return true;
    if (isCancelling) return true;
    return false;
  };

  const handleWarningConfirm = () => {
    setShowWarningModal(false);
    handleConfirmCancellation();
  };

  const handleWarningCancel = () => {
    setShowWarningModal(false);
  };

  const handleProceedToWarning = () => {
    if (isConfirmDisabled()) return;
    setShowWarningModal(true);
  };

  const isPerTableReservation = () => {
    if (!selectedReservation) return false;

    const reservationType =
      selectedReservation.reservation_type ||
      selectedReservation.reservationType ||
      "";

    const packageName = selectedReservation.package_name || "";
    const isEventPackage =
      packageName.toLowerCase().includes("standard") ||
      packageName.toLowerCase().includes("premium") ||
      packageName.toLowerCase().includes("event");

    if (isEventPackage) {
      return false;
    }

    if (reservationType.toLowerCase() === "event") {
      return false;
    }

    if (!reservationType) {
      return true;
    }

    return reservationType.toLowerCase() === "per_table";
  };

  const handleFileRefund = () => {
    if (isPerTableReservation()) {
      showToast("Refund is not available for PER TABLE reservations.", "error");
      return;
    }

    const finalReason =
      cancelReason === "Other" ? cancelReasonText : cancelReason;
    if (!finalReason || !agreeToTerms) return;

    navigate("/file-a-refund", {
      state: {
        reservationId: selectedReservation?.reservation_id,
        reason: finalReason,
        reservationType: "event",
      },
    });

    handleCloseCancelModal();
    closeModal();
  };

  const handleConfirmCancellation = () => {
    if (isConfirmDisabled()) return;
    handleProceedToCancellation(
      cancelReason === "Other" ? cancelReasonText : cancelReason,
    );
  };

  const handleProceedToCancellation = async (finalReason) => {
    setIsCancelling(true);

    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

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

      showToast(`Reservation cancelled successfully.\nReason: ${finalReason}`);

      await fetchUserReservations();
      await fetchUserHistory();
      setActiveTab("history");
      setShowAllHistory(false); // Reset to show only 5
      handleCloseCancelModal();
      closeModal();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      showToast("Failed to cancel reservation. Please try again.");
    } finally {
      setIsCancelling(false);
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
      case "refunded":
        return "status-refunded";
      default:
        return "";
    }
  };

  const getHistoryStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "cancelled":
        return <XCircle size={16} className="history-icon cancelled" />;
      case "completed":
        return <CheckCircle size={16} className="history-icon completed" />;
      case "refunded":
        return <RefreshCw size={16} className="history-icon refunded" />;
      default:
        return null;
    }
  };

  const getAssignedTablesDisplay = (reservation) => {
    const isEvent =
      reservation.reservation_type === "event" ||
      reservation.reservation_type === "EVENT" ||
      reservation.reservationType === "event" ||
      reservation.reservationType === "EVENT";

    if (isEvent) {
      return "Full Venue (All Tables)";
    }

    return reservation.assigned_tables || "Not assigned";
  };

  const getGuestDisplay = (reservation) => {
    const numGuests = reservation.num_guests;

    if (!numGuests && numGuests !== 0) return "Not specified";

    const parsed = parseInt(numGuests);
    if (!isNaN(parsed) && String(parsed) === String(numGuests)) {
      return `${parsed} ${parsed === 1 ? "Guest" : "Guests"}`;
    }

    if (
      typeof numGuests === "string" &&
      (numGuests.includes(",") || /T\d+/.test(numGuests))
    ) {
      const actualCount =
        reservation.guests ||
        reservation.pax ||
        reservation.guest_count ||
        reservation.num_guests_actual;

      if (actualCount && !isNaN(parseInt(actualCount))) {
        const count = parseInt(actualCount);
        return `${count} ${count === 1 ? "Guest" : "Guests"}`;
      }

      if (reservation.pax && !isNaN(parseInt(reservation.pax))) {
        const count = parseInt(reservation.pax);
        return `${count} ${count === 1 ? "Guest" : "Guests"}`;
      }

      return `Tables: ${numGuests}`;
    }

    return numGuests;
  };

  const renderWarningModal = () => (
    <div className="warning-modal-overlay" onClick={handleWarningCancel}>
      <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="warning-modal-header">
          <div className="warning-icon">
            <TriangleAlert size={32} />
          </div>
          <h3>⚠️ Confirm Cancellation</h3>
        </div>
        <div className="warning-modal-body">
          <p className="warning-message">
            Are you sure you want to cancel this reservation?
          </p>
          <div className="warning-info">
            <AlertCircle size={16} />
            <span>
              <strong>No refund</strong> will be issued for cancellation.
            </span>
          </div>
          <div className="warning-refund-hint">
            <span>
              If you want a refund, click the <strong>"File a Refund"</strong>{" "}
              button below before confirming cancellation.
            </span>
          </div>
        </div>
        <div className="warning-modal-footer">
          <button className="warning-cancel-btn" onClick={handleWarningCancel}>
            Cancel
          </button>
          <button
            className="warning-confirm-btn"
            onClick={handleWarningConfirm}
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveReservations = () => (
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
          <div key={reservation.reservation_id} className="reservation-card">
            <div className="reservation-card-header">
              <div className="reservation-id">
                <span className="id-label">Reservation ID:</span>
                <span className="id-value">{reservation.reservation_id}</span>
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
                  <span>{getGuestDisplay(reservation)}</span>
                </div>
              </div>

              <div className="reservation-tables">
                <span className="tables-label">Tables:</span>
                <span className="tables-value">
                  {getAssignedTablesDisplay(reservation)}
                </span>
              </div>

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
  );

  // ===== Render history reservations with limit =====
  const renderHistoryReservations = () => (
    <div className="reservations-list history-list">
      {historyLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading history...</p>
        </div>
      ) : displayedHistory.length === 0 ? (
        <div className="empty-state">
          <History size={64} />
          <h3>No History</h3>
          <p>
            {historyFilter === "all"
              ? "You don't have any past reservations."
              : `No ${historyFilter} reservations found.`}
          </p>
        </div>
      ) : (
        <>
          {displayedHistory.map((reservation) => (
            <div
              key={reservation.reservation_id}
              className={`reservation-card history-card ${reservation.status?.toLowerCase()}`}
            >
              <div className="reservation-card-header">
                <div className="reservation-id">
                  <span className="id-label">Reservation ID:</span>
                  <span className="id-value">{reservation.reservation_id}</span>
                </div>
                <div
                  className={`status-badge ${getStatusBadgeClass(reservation.status)}`}
                >
                  {getHistoryStatusIcon(reservation.status)}
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
                    <span>{getGuestDisplay(reservation)}</span>
                  </div>
                </div>

                <div className="reservation-tables">
                  <span className="tables-label">Tables:</span>
                  <span className="tables-value">
                    {getAssignedTablesDisplay(reservation)}
                  </span>
                </div>

                {reservation.package_name &&
                  reservation.package_name !== "Table Reservation" && (
                    <div className="reservation-package">
                      <span className="package-label">Package:</span>
                      <span className="package-value">
                        {reservation.package_name}
                      </span>
                    </div>
                  )}

                {reservation.cancellation_reason && (
                  <div className="cancellation-reason">
                    <AlertCircle size={14} />
                    <span>Reason: {reservation.cancellation_reason}</span>
                  </div>
                )}
              </div>

              <div className="reservation-card-footer">
                <button
                  className="view-details-btn"
                  onClick={() => handleViewDetails(reservation)}
                >
                  <Eye size={16} />
                  View Details
                </button>
              </div>
            </div>
          ))}

          {/* ===== Show All / Show Less Button ===== */}
          {filteredHistory.length > 5 && (
            <button
              className="show-all-btn"
              onClick={() => setShowAllHistory(!showAllHistory)}
            >
              {showAllHistory ? (
                <>
                  <ChevronUp size={18} />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={18} />
                  Show All ({filteredHistory.length - 5} more)
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );

  // ===== Filter buttons for history =====
  const renderFilterButtons = () => (
    <div className="history-filters">
      <button
        className={`filter-btn ${historyFilter === "all" ? "active" : ""}`}
        onClick={() => {
          setHistoryFilter("all");
          setShowAllHistory(false);
        }}
      >
        All ({historyReservations.length})
      </button>
      <button
        className={`filter-btn ${historyFilter === "cancelled" ? "active" : ""}`}
        onClick={() => {
          setHistoryFilter("cancelled");
          setShowAllHistory(false);
        }}
      >
        <XCircle size={14} />
        Cancelled (
        {
          historyReservations.filter(
            (r) => r.status?.toLowerCase() === "cancelled",
          ).length
        }
        )
      </button>
      <button
        className={`filter-btn ${historyFilter === "completed" ? "active" : ""}`}
        onClick={() => {
          setHistoryFilter("completed");
          setShowAllHistory(false);
        }}
      >
        <CheckCircle size={14} />
        Completed (
        {
          historyReservations.filter(
            (r) => r.status?.toLowerCase() === "completed",
          ).length
        }
        )
      </button>
      <button
        className={`filter-btn ${historyFilter === "refunded" ? "active" : ""}`}
        onClick={() => {
          setHistoryFilter("refunded");
          setShowAllHistory(false);
        }}
      >
        <RefreshCw size={14} />
        Refunded (
        {
          historyReservations.filter(
            (r) => r.status?.toLowerCase() === "refunded",
          ).length
        }
        )
      </button>
    </div>
  );

  return (
    <>
      <div className="my-reservation-page">
        <div className="my-reservation-container">
          <div className="my-reservation-header">
            <h1>My Reservations</h1>
            <p>View and manage your upcoming table reservations</p>
          </div>

          <div className="reservation-tabs">
            <button
              className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              <Calendar size={16} />
              Active Reservations
              {reservations.length > 0 && (
                <span className="tab-badge">{reservations.length}</span>
              )}
            </button>
            <button
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <History size={16} />
              History
              {historyReservations.length > 0 && (
                <span className="tab-badge">{historyReservations.length}</span>
              )}
            </button>
          </div>

          {activeTab === "history" && renderFilterButtons()}

          {activeTab === "active"
            ? renderActiveReservations()
            : renderHistoryReservations()}
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
                      {getGuestDisplay(selectedReservation)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Assigned Tables:</span>
                    <span className="detail-value">
                      {getAssignedTablesDisplay(selectedReservation)}
                    </span>
                  </div>

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

                  <div className="detail-row">
                    <span className="detail-label">Full Address:</span>
                    <span className="detail-value">
                      {selectedReservation.full_address || "Not specified"}
                    </span>
                  </div>

                  {selectedReservation.cancellation_reason && (
                    <div className="detail-row">
                      <span className="detail-label">Cancellation Reason:</span>
                      <span className="detail-value">
                        {selectedReservation.cancellation_reason}
                      </span>
                    </div>
                  )}
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

                  {selectedReservation.payment_status?.toLowerCase() ===
                    "rejected" && (
                    <div
                      className="reupload-proof-card p-3 my-3 rounded-3"
                      style={{
                        backgroundColor: "rgba(220, 53, 69, 0.08)",
                        border: "1px solid rgba(220, 53, 69, 0.25)",
                      }}
                    >
                      <div className="d-flex align-items-center text-danger fw-bold mb-1 small">
                        <AlertCircle size={15} className="me-2" />
                        PROOF OF PAYMENT REJECTED
                      </div>
                      <p
                        className="text-muted mb-3"
                        style={{ fontSize: "0.8rem" }}
                      >
                        Reason:{" "}
                        <strong className="text-dark">
                          {selectedReservation.rejection_reason ||
                            "Receipt details do not match your order."}
                        </strong>
                      </p>

                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />

                      <button
                        className="btn btn-sm btn-danger fw-bold w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{ fontSize: "0.8rem" }}
                      >
                        {uploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm"></span>
                            Uploading Proof...
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            Upload New Receipt Proof
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="reservation-modal-footer">
                {selectedReservation.status?.toLowerCase() !== "cancelled" &&
                  selectedReservation.status?.toLowerCase() !== "completed" &&
                  selectedReservation.status?.toLowerCase() !== "refunded" && (
                    <button
                      className="cancel-reservation-btn"
                      onClick={handleCancelClick}
                    >
                      <AlertCircle size={16} />
                      Cancel Reservation
                    </button>
                  )}
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
                  className={`cancel-modal-refund-btn ${isConfirmDisabled() || isPerTableReservation() ? "disabled" : ""}`}
                  onClick={handleFileRefund}
                  disabled={isConfirmDisabled() || isPerTableReservation()}
                  style={{
                    opacity:
                      isConfirmDisabled() || isPerTableReservation() ? 0.5 : 1,
                    cursor:
                      isConfirmDisabled() || isPerTableReservation()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  File a Refund
                  {isPerTableReservation() && (
                    <span
                      className="refund-hint"
                      style={{
                        fontSize: "10px",
                        display: "block",
                        fontWeight: "normal",
                      }}
                    >
                      (Not available for PER TABLE)
                    </span>
                  )}
                </button>
                <button
                  className={`cancel-modal-confirm-btn ${isConfirmDisabled() ? "disabled" : ""}`}
                  onClick={handleProceedToWarning}
                  disabled={isConfirmDisabled()}
                >
                  {isCancelling ? (
                    <>
                      <span className="btn-spinner-small"></span>
                      Processing...
                    </>
                  ) : (
                    "Cancel Reservation"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showWarningModal && renderWarningModal()}

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
