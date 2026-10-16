import React, { useState, useEffect, useRef } from "react"; // Added useRef
import axios from "axios";
import io from "socket.io-client";
import { Trash2, Archive } from "lucide-react";
import DeletedNotifications from "./DeletedNotifications";
import "../../Style/Notifications.css";
import { useToast } from "../ToastContext";
import { API_BASE, SOCKET_URL, resolveAssetUrl } from "../../api";

const announcementTypeLabels = {
  promo: "Promotion",
  menu: "New menu",
  event: "Event",
  update: "Hangout update",
};

const getAnnouncementDetails = (notification, publishedAnnouncements = []) => {
  if (notification.announcement) return notification.announcement;
  try {
    const payload = JSON.parse(notification.message);
    if (payload?.kind === "announcement") return payload;
  } catch {
    // Older announcement notifications stored plain text instead of metadata.
  }

  if (!/^new announcement\b/i.test(notification.title || "")) return null;
  const legacyTitle = notification.title
    .replace(/^new announcement\s*:?\s*/i, "")
    .trim()
    .toLowerCase();
  const legacyMessage = String(notification.message || "").trim().toLowerCase();
  const match = publishedAnnouncements.find((announcement) =>
    (legacyTitle && announcement.title?.trim().toLowerCase() === legacyTitle) ||
    (legacyMessage && announcement.description?.trim().toLowerCase() === legacyMessage),
  );

  return match
    ? {
        title: match.title,
        description: match.description,
        announcement_type: match.announcement_type,
        image_url: match.local_path || match.image_url || null,
      }
    : null;
};

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
        newSocket.emit("join_user", userId);
      });

      newSocket.on("new_notification", (notification) => {
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
      const [res, announcementsRes] = await Promise.all([
        axios.get(`${API_BASE}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/announcements`).catch(() => ({ data: [] })),
      ]);
      const publishedAnnouncements = Array.isArray(announcementsRes.data)
        ? announcementsRes.data
        : [];
      setNotifications(
        res.data.map((notification) => {
          const announcement = getAnnouncementDetails(notification, publishedAnnouncements);
          return announcement ? { ...notification, announcement } : notification;
        }),
      );
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
    // The notification click handler must pass the actual reservation ID.
    // If the identifier is missing or is a placeholder such as "Payment",
    // do not hit the endpoint — show a meaningful message instead of a raw
    // JSON error.
    if (
      !reservationId ||
      String(reservationId).trim() === "" ||
      /^(payment|proof|null|undefined)$/i.test(String(reservationId).trim())
    ) {
      showToast(
        "This notification does not reference a valid reservation. It may belong to an older record.",
      );
      return;
    }

    setModalLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/reservations/details/${reservationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSelectedReservation(response.data.reservation);
      setShowReservationModal(true);
    } catch (err) {
      // A deleted / inaccessible reservation is expected sometimes (e.g. the
      // 12-hour auto-cancel job removed it). Show a clear message instead of
      // surfacing the raw API error JSON to the customer.
      console.error("Error fetching reservation details:", err.message);
      showToast(
        "This reservation is no longer available. It may have been cancelled or removed.",
      );
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
    } catch (err) {
      console.error("Error re-uploading proof:", err.message);
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
    // 1. Preferred: the structured reservation_id column. New rejection
    //    notifications carry the real ID here.
    if (notification.reservation_id && notification.reservation_id !== "null") {
      return notification.reservation_id;
    }

    // 2. Fallback: parse the ID out of the message. Only accept values that
    //    look like reservation IDs (RES-XXXXXX / WALK-XXXXXX). The previous
    //    broad match on the title grabbed the word "Payment" out of
    //    "Payment Proof Rejected" and produced a bogus "Reservation ID:
    //    Payment" badge plus a failed lookup.
    let match = notification.message?.match(/Reservation ID:\s*([A-Z0-9-]+)/i);
    if (match) return match[1].toUpperCase();

    match = notification.message?.match(/\b(RES|WALK)-[A-Z0-9]+\b/i);
    if (match) return match[0].toUpperCase();

    match = notification.title?.match(/\b(RES|WALK)-[A-Z0-9]+\b/i);
    if (match) return match[0].toUpperCase();

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
                const announcement = getAnnouncementDetails(notif);
                return (
                  <div
                    key={notif.notification_id}
                    className={`notification-item ${!notif.is_read ? "unread" : "read"}`}
                  >
                    <div className="notification-card-content">
                      <div className="notification-icon">
                        <span className="notification-emoji">{announcement ? "📣" : "🔔"}</span>
                      </div>
                      <div className="notification-content">
                        <div className="notification-top">
                          <span className="notification-title">
                            {announcement?.title || notif.title}
                          </span>
                          {announcement && (
                            <span className="notification-category">
                              {announcementTypeLabels[announcement.announcement_type] || "Announcement"}
                            </span>
                          )}
                          <span className="notification-time">
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                        {announcement ? (
                          <>
                            {announcement.image_url && (
                              <img
                                className="notification-announcement-image"
                                src={resolveAssetUrl(announcement.image_url)}
                                alt={announcement.title}
                                loading="lazy"
                              />
                            )}
                            <p className="notification-message">{announcement.description}</p>
                          </>
                        ) : (
                          <p className="notification-message">{notif.message}</p>
                        )}

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
