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
      // Setup Socket.IO
      const newSocket = io("http://localhost:5000", {
        transports: ["websocket", "polling"],
      });
      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Socket connected");
        newSocket.emit("join_user", userId);
      });

      // In the new_notification event handler, make sure the field names match your DB
      newSocket.on("new_notification", (notification) => {
        console.log("New notification:", notification);
        // Ensure the notification has the correct field names
        setNotifications((prev) => [
          {
            notification_id: notification.notification_id,
            title: notification.title,
            message: notification.message,
            reservation_id: notification.reservation_id,
            is_read: notification.is_read || 0,
            created_at: notification.created_at || new Date().toISOString(),
          },
          ...prev,
        ]);
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

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <div className="header-left">
            <h1>Notifications</h1>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount} new</span>
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
            <p>Loading notifications...</p>
          ) : notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.notification_id}
                className={`notification-item ${!notif.is_read ? "unread" : "read"}`}
                onClick={() =>
                  !notif.is_read && markAsRead(notif.notification_id)
                }
              >
                <div className="notification-icon">
                  {!notif.is_read && <span className="unread-dot"></span>}
                </div>
                <div className="notification-content">
                  <h4>{notif.title}</h4>
                  <p>{notif.message}</p>
                  <small>{new Date(notif.created_at).toLocaleString()}</small>
                </div>
              </div>
            ))
          ) : (
            <p>No notifications yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
