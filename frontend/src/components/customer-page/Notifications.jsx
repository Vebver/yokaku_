import React, { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import { Trash2, Archive } from "lucide-react";
import DeletedNotifications from "./DeletedNotifications";
import "../../Style/Notifications.css";

const Notifications = () => {
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      const newSocket = io("http://localhost:5000", {
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
      const res = await axios.get("/api/notifications", {
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
      const res = await axios.get("/api/notifications/unread-count", {
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
        `/api/notifications/${id}/read`,
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
        "/api/notifications/read-all",
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

  // Soft delete notification (move to trash)
  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/notifications/${notificationToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(
        notifications.filter((n) => n.notification_id !== notificationToDelete),
      );
      // Alert removed - no popup notification
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

  // Fetch and show reservation details
  const handleViewReservation = async (reservationId) => {
    setModalLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedReservation(response.data.reservation);
      setShowReservationModal(true);
    } catch (err) {
      console.error("Error fetching reservation details:", err);
      alert("Failed to load reservation details. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowReservationModal(false);
    setSelectedReservation(null);
  };

  // Format time difference
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

  // Format date to "April 24, 2026"
  const formatDateReadable = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Extract reservation ID from message
  const extractReservationId = (message) => {
    const match = message.match(/Reservation ID: ([A-Z0-9-]+)/i);
    return match ? match[1] : null;
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
                const reservationId = extractReservationId(notif.message);
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
                            ID: {reservationId}
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

      {/* Delete Confirmation Modal */}
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
                    {selectedReservation.reservation_time} -{" "}
                    {selectedReservation.end_time}
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
                {selectedReservation.payment_status && (
                  <div className="reservation-detail-row">
                    <span className="detail-label">Payment Status:</span>
                    <span className="detail-value">
                      {selectedReservation.payment_status}
                    </span>
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

      {/* Deleted Notifications Modal */}
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
