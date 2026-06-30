import React, { useState, useEffect, useRef } from "react"; // Added useRef
import axios from "axios";
import io from "socket.io-client";
import { Trash2, Archive } from "lucide-react";
import DeletedNotifications from "./DeletedNotifications";
import "../../Style/Notifications.css";
import { useToast } from "../ToastContext";
const SOCKET_URL = "https://yokaku-backend.onrender.com";
const API_BASE = "https://yokaku-backend.onrender.com/api";

const Notifications = () => {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // States for re-uploading proof within the notification details modal
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
      });
      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Socket connected");
        newSocket.emit("join_user", userId);
      });

      newSocket.on("new_notification", (notification) => {
        console.log("New notification:", notification);
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      newSocket.on("unread_count_updated", (data) => {
        setUnreadCount(data.unreadCount);
      });
    }

    fetchNotifications();
    fetchUnreadCount();

    return () => {
      if (socket) socket.close();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error("Error fetching unread count", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications(
        notifications.map((n) =>
          n.notification_id === id ? { ...n, is_read: 1 } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/notifications/read-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications(notifications.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/notifications/${notificationToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(
        notifications.filter((n) => n.notification_id !== notificationToDelete),
      );
    } catch (err) {
      console.error("Error deleting notification:", err);
    } finally {
      setShowConfirmDelete(false);
      setNotificationToDelete(null);
    }
  };

  const openDeleteConfirm = (id, e) => {
    e.stopPropagation();
    setNotificationToDelete(id);
    setShowConfirmDelete(true);
  };

  const handleViewReservation = async (reservationId) => {
    setModalLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/reservations/details/${reservationId}`, // <-- Point to the new details route
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSelectedReservation(response.data.reservation);
      setShowReservationModal(true);
    } catch (err) {
      console.error("Error fetching reservation details:", err);
      showToast("Failed to load reservation details. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  // Handler for uploading proof within the notification modal
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
      );

      fetchNotifications();
      closeModal();
    } catch (error) {
      console.error("Error re-uploading proof:", error);
      showToast("Failed to submit receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setShowReservationModal(false);
    setSelectedReservation(null);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "JUST NOW";
    if (diffMins < 60) return `${diffMins} MIN AGO`;
    if (diffHours < 24)
      return `${diffHours} HOUR${diffHours > 1 ? "S" : ""} AGO`;
    return `${diffDays} DAY${diffDays > 1 ? "S" : ""} AGO`;
  };

  const formatDateReadable = (dateString) => {
    if (!dateString) return "N/A";
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

  const getReservationId = (notification) => {
    if (notification.reservation_id && notification.reservation_id !== "null") {
      return notification.reservation_id;
    }

    let match = notification.message?.match(/Reservation ID: ([A-Z0-9-]+)/i);
    if (match) return match[1];

    match = notification.title?.match(/([A-Z0-9-]+)/i);
    if (match) return match[1];

    match = notification.message?.match(/([A-Z0-9]{8,})/i);
    if (match) return match[1];

    return null;
  };

  return (
    <>
      <div className="notifications-page">
        <div className="notifications-container">
          <div className="notifications-header">
            <div className="header-left">
              <h1>Your Inbox</h1>
              <p>
                Recent reservations, updates, and invitations from your dining
                circle.
              </p>
            </div>
            <button
              className="view-deleted-btn"
              onClick={() => setShowDeletedModal(true)}
            >
              <Archive size={18} />
              View Deleted
            </button>
          </div>

          <div className="notification-stats">
            <div className="unread-count">
              {unreadCount > 0 && (
                <>
                  <span className="unread-badge">{unreadCount} NEW</span>
                  <span className="unread-label">Unread messages</span>
                </>
              )}
            </div>
            {notifications.some((n) => !n.is_read) && (
              <button className="mark-all-btn" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="loading-spinner">Loading notifications...</div>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => {
                const reservationId = getReservationId(notif);
                return (
                  <div
                    key={notif.notification_id}
                    className={`notification-item ${!notif.is_read ? "unread" : "read"}`}
                  >
                    <div className="notification-card-content">
                      <div className="notification-icon">
                        <span className="notification-emoji">🔔</span>
                      </div>
                      <div className="notification-content">
                        <div className="notification-top">
                          <span className="notification-title">
                            {notif.title}
                          </span>
                          <span className="notification-time">
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                        <p className="notification-message">{notif.message}</p>

                        {reservationId && (
                          <div className="notif-res-id-badge">
                            Reservation ID: {reservationId}
                          </div>
                        )}

                        <div className="notification-actions-bottom">
                          <div className="notification-actions">
                            <button
                              className={`mark-read-btn ${notif.is_read ? "already-read" : ""}`}
                              onClick={() =>
                                !notif.is_read &&
                                markAsRead(notif.notification_id)
                              }
                              disabled={notif.is_read}
                            >
                              {notif.is_read ? "Read" : "Mark as read"}
                            </button>
                            {reservationId && (
                              <button
                                className="view-btn"
                                onClick={() =>
                                  handleViewReservation(reservationId)
                                }
                              >
                                View
                              </button>
                            )}
                          </div>
                          <button
                            className="delete-notif-btn"
                            onClick={(e) =>
                              openDeleteConfirm(notif.notification_id, e)
                            }
                            title="Move to trash"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-notifications">
                <p>No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div
          className="confirm-modal-overlay"
          onClick={() => setShowConfirmDelete(false)}
        >
          <div
            className="confirm-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete Notification</h3>
            <p>
              Are you sure you want to delete this notification? It will be
              moved to trash and automatically deleted after 30 days.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="confirm-cancel"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-delete"
                onClick={handleDeleteNotification}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Detail Modal */}
      {showReservationModal && (
        <div className="reservation-modal-overlay" onClick={closeModal}>
          <div
            className="reservation-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reservation-modal-header">
              <h2>Reservation Details</h2>
              <button className="reservation-modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            {modalLoading ? (
              <div className="reservation-modal-loading">
                Loading reservation details...
              </div>
            ) : selectedReservation ? (
              <div className="reservation-modal-content">
                <div className="reservation-detail-row">
                  <span className="detail-label">Reservation ID:</span>
                  <span className="detail-value">
                    {selectedReservation.reservation_id}
                  </span>
                </div>
                <div className="reservation-detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {formatDateReadable(selectedReservation.reservation_date)}
                  </span>
                </div>
                <div className="reservation-detail-row">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">
                    {formatTimeDisplay(selectedReservation.reservation_time)} -{" "}
                    {formatTimeDisplay(selectedReservation.end_time)}
                  </span>
                </div>
                <div className="reservation-detail-row">
                  <span className="detail-label">Guests:</span>
                  <span className="detail-value">
                    {selectedReservation.num_guests}
                  </span>
                </div>
                <div className="reservation-detail-row">
                  <span className="detail-label">Status:</span>
                  <span
                    className={`status-badge ${selectedReservation.status?.toLowerCase()}`}
                  >
                    {selectedReservation.status}
                  </span>
                </div>
                {selectedReservation.assigned_tables && (
                  <div className="reservation-detail-row">
                    <span className="detail-label">Tables:</span>
                    <span className="detail-value">
                      {selectedReservation.assigned_tables}
                    </span>
                  </div>
                )}
                {selectedReservation.package_name && (
                  <div className="reservation-detail-row">
                    <span className="detail-label">Package:</span>
                    <span className="detail-value">
                      {selectedReservation.package_name}
                    </span>
                  </div>
                )}
                {selectedReservation.payment_method && (
                  <div className="reservation-detail-row">
                    <span className="detail-label">Payment Method:</span>
                    <span className="detail-value">
                      {selectedReservation.payment_method}
                    </span>
                  </div>
                )}
                <div className="reservation-detail-row">
                  <span className="detail-label">Payment Status:</span>
                  <span className="detail-value">
                    {selectedReservation.payment_status || "Pending"}
                  </span>
                </div>

                {/* EMEDDED RE-UPLOAD INTERACTIVE CARD inside the notification's detail view */}
                {selectedReservation.payment_status?.toLowerCase() ===
                  "rejected" && (
                  <div
                    className="reupload-proof-box p-3 my-3 rounded-3"
                    style={{
                      backgroundColor: "rgba(220, 53, 69, 0.08)",
                      border: "1px solid rgba(220, 53, 69, 0.25)",
                    }}
                  >
                    <div className="text-danger fw-bold mb-1 small d-flex align-items-center">
                      ⚠️ PROOF OF PAYMENT REJECTED
                    </div>
                    <p
                      className="text-muted mb-3"
                      style={{ fontSize: "0.8rem", textAlign: "left" }}
                    >
                      Reason:{" "}
                      <strong className="text-dark">
                        {selectedReservation.rejection_reason ||
                          "Receipt details mismatch."}
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
                      className="btn btn-sm btn-danger fw-bold w-100 py-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        fontSize: "0.8rem",
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Uploading Proof...
                        </>
                      ) : (
                        "Upload New Receipt Proof"
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="reservation-modal-error">
                No reservation details found.
              </div>
            )}

            <div className="reservation-modal-footer">
              <button className="reservation-modal-ok" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletedModal && (
        <DeletedNotifications
          onClose={() => setShowDeletedModal(false)}
          onRestore={fetchNotifications}
        />
      )}
    </>
  );
};

export default Notifications;
