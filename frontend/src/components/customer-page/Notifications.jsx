import React, { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import "../../Style/Notifications.css";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

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

  // Format time difference (e.g., "2 MIN AGO")
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

  // Format date for display (e.g., "Wed, Apr 29 · 10:00 AM")
  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <h1>Your Inbox</h1>
          <p>Recent reservation and updates</p>
        </div>

        <div className="notification-stats">
          <div className="unread-count">
            {unreadCount > 0 && (
              <>
                <span className="unread-badge">{unreadCount}NEW</span>
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
            notifications.map((notif) => (
              <div
                key={notif.notification_id}
                className={`notification-item ${!notif.is_read ? "unread" : "read"}`}
              >
                <div className="notification-card-content">
                  <div className="notification-icon"></div>
                  <div className="notification-content">
                    <div className="notification-top">
                      <span className="notification-title">{notif.title}</span>
                      <span className="notification-time">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="notification-message">{notif.message}</p>
                    {notif.reservation_id && (
                      <div className="notif-res-id-badge">
                        ID: {notif.reservation_id}
                      </div>
                    )}
                    <div className="notification-actions">
                      {!notif.is_read && (
                        <button
                          className="mark-read-btn"
                          onClick={() => markAsRead(notif.notification_id)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-notifications">
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
