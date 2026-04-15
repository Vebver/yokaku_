import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../Style/Notifications.css";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => 
        n.notification_id === id ? { ...n, is_read: 1 } : n
      ));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put("http://localhost:5000/api/notifications/read-all", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        
        <div className="notifications-header">
          <h1 className="notif-title-text">NOTIFICATIONS</h1>
          {!loading && notifications.some(n => !n.is_read) && (
            <button className="mark-all-btn" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>

        <div className="notifications-list">
          {loading ? (
            <div className="no-notifications"><p>Loading notifications...</p></div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.notification_id}
                className={`notification-item ${n.is_read ? "read" : "unread"}`}
                onClick={() => !n.is_read && markAsRead(n.notification_id)}
              >
                <div className="notification-icon-area">
                  <div className="status-dot"></div>
                </div>
                <div className="notification-content">
                  <div className="notification-top">
                    <div className="notification-title-group">
                        <span className="notification-title">{n.title || "UPDATE"}</span>
                        
                        {n.reservation_id && (
                            <span className="notif-res-id-badge">
                                {n.reservation_id}
                            </span>
                        )}
                    </div>
                    <span className="notification-time">
                        {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="notification-message">{n.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-notifications">
              <p>You have no notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;