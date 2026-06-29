import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RotateCcw, Trash2, X } from "lucide-react";
import "../../Style/Notifications.css";
import { useToast } from "../ToastContext";

const API_BASE = "https://yokaku-backend.onrender.com/api";

const DeletedNotifications = ({ onClose, onRestore }) => {
  const { showToast } = useToast();
  const [deletedNotifications, setDeletedNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState({});
  const [notificationToDeletePermanently, setNotificationToDeletePermanently] =
    useState(null);
  const [showConfirmPermanentDelete, setShowConfirmPermanentDelete] =
    useState(false);

  // Helper function to safely get array from response
  const getNotificationsArray = (data) => {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data && Array.isArray(data.notifications)) {
      return data.notifications;
    }
    console.error("Unexpected data format:", data);
    return [];
  };

  // Define fetchDeletedNotifications with useCallback to prevent recreation
  const fetchDeletedNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }

      console.log("Fetching deleted notifications...");
      const res = await axios.get(`${API_BASE}/notifications/deleted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Deleted notifications response:", res.data);

      // Safely get the array from response
      const notificationsArray = getNotificationsArray(res.data);
      setDeletedNotifications(notificationsArray);

      // Calculate initial days left
      const initialDays = {};
      notificationsArray.forEach((notif) => {
        if (notif.deleted_at) {
          const deletedDate = new Date(notif.deleted_at);
          const now = new Date();
          const diffDays = Math.ceil(
            (now - deletedDate) / (1000 * 60 * 60 * 24),
          );
          const daysRemaining = Math.max(0, 30 - diffDays);
          initialDays[notif.notification_id] = daysRemaining;
        }
      });
      setDaysLeft(initialDays);
    } catch (err) {
      console.error("Error fetching deleted notifications:", err);
      setDeletedNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch deleted notifications - runs only once when component mounts
  useEffect(() => {
    fetchDeletedNotifications();
  }, [fetchDeletedNotifications]);

  // Update days left every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDaysLeft((prev) => {
        const newDays = { ...prev };
        deletedNotifications.forEach((notif) => {
          if (notif.deleted_at) {
            const deletedDate = new Date(notif.deleted_at);
            const now = new Date();
            const diffDays = Math.ceil(
              (now - deletedDate) / (1000 * 60 * 60 * 24),
            );
            const daysRemaining = Math.max(0, 30 - diffDays);
            newDays[notif.notification_id] = daysRemaining;
          }
        });
        return newDays;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [deletedNotifications]);

  const handleRestore = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/notifications/${id}/restore`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Refresh the list after restore
      await fetchDeletedNotifications();
      if (onRestore) onRestore();
    } catch (err) {
      console.error("Error restoring notification:", err);
      showToast("Failed to restore notification");
    }
  };

  const handlePermanentDelete = async () => {
    if (!notificationToDeletePermanently) return;

    try {
      const token = localStorage.getItem("token");
      console.log(
        `🔍 Attempting to permanently delete notification: ${notificationToDeletePermanently}`,
      );

      await axios.delete(
        `${API_BASE}/notifications/${notificationToDeletePermanently}/permanent`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("✅ Delete successful");

      // Refresh the deleted notifications list
      await fetchDeletedNotifications();

      // Also refresh the main notifications if onRestore is provided
      if (onRestore) onRestore();
    } catch (err) {
      console.error("❌ Error permanently deleting notification:", err);
      showToast(
        `Failed to permanently delete notification: ${err.response?.data?.error || err.message}`,
      );
    } finally {
      setShowConfirmPermanentDelete(false);
      setNotificationToDeletePermanently(null);
    }
  };

  const openPermanentDeleteConfirm = (id, e) => {
    e.stopPropagation();
    console.log("🔍 Opening delete confirmation for notification:", id);
    setNotificationToDeletePermanently(id);
    setShowConfirmPermanentDelete(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="deleted-modal-overlay" onClick={onClose}>
        <div
          className="deleted-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="deleted-modal-header">
            <h2>Deleted Notifications</h2>
            <button className="deleted-modal-close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className="deleted-modal-content">
            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : deletedNotifications.length === 0 ? (
              <div className="no-deleted">
                <p>No deleted notifications</p>
                <p className="deleted-hint">
                  Notifications will be permanently deleted after 30 days in
                  trash
                </p>
              </div>
            ) : (
              <div className="deleted-list">
                {deletedNotifications.map((notif) => (
                  <div key={notif.notification_id} className="deleted-item">
                    <div className="deleted-item-content">
                      <div className="deleted-item-header">
                        <span className="deleted-title">{notif.title}</span>
                        <span className="deleted-expiry">
                          Expires in: {daysLeft[notif.notification_id] || 0}{" "}
                          days
                        </span>
                      </div>
                      <p className="deleted-message">{notif.message}</p>
                      <div className="deleted-meta">
                        <span className="deleted-date">
                          Deleted: {formatDate(notif.deleted_at)}
                        </span>
                        <span className="deleted-original">
                          Created: {formatDate(notif.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="deleted-item-actions">
                      <button
                        className="restore-btn"
                        onClick={() => handleRestore(notif.notification_id)}
                      >
                        <RotateCcw size={16} />
                        Restore
                      </button>
                      <button
                        className="permanent-delete-btn"
                        onClick={(e) =>
                          openPermanentDeleteConfirm(notif.notification_id, e)
                        }
                      >
                        <Trash2 size={16} />
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="deleted-modal-footer">
            <p className="deleted-info">
              <span>⏰</span> Notifications are automatically permanently
              deleted after 30 days in trash
            </p>
            <button className="deleted-close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {showConfirmPermanentDelete && (
        <div
          className="confirm-modal-overlay"
          onClick={() => setShowConfirmPermanentDelete(false)}
        >
          <div
            className="confirm-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Permanently Delete Notification</h3>
            <p>
              Are you sure you want to permanently delete this notification?
              This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="confirm-cancel"
                onClick={() => setShowConfirmPermanentDelete(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-delete-permanent"
                onClick={handlePermanentDelete}
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeletedNotifications;
