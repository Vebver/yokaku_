import React, { useState } from "react";
import "../../Style/Notifications.css";

const Notifications = () => {
  // Mock data for notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Reservation Confirmed",
      message:
        "Your reservation for March 20, 2026 at 12:00 PM has been confirmed. See you there!",
      time: "2026-03-18 09:30 AM",
      isRead: false,
      type: "success",
    },
    {
      id: 2,
      title: "New Promo Available",
      message:
        "Check out our new 'Weekend Wings' promo! Get 20% off on all bucket orders.",
      time: "2026-03-17 02:15 PM",
      isRead: false,
      type: "promo",
    },
    {
      id: 3,
      title: "Table Update",
      message: "We have assigned Table #12 to your upcoming reservation.",
      time: "2026-03-16 11:00 AM",
      isRead: true,
      type: "info",
    },
    {
      id: 4,
      title: "Account Security",
      message: "Your password was successfully changed.",
      time: "2026-03-10 08:00 PM",
      isRead: true,
      type: "alert",
    },
  ]);

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="notifications-page">
      <div className="notifications-container fade-in">
        <div className="notifications-header">
          <h1>NOTIFICATIONS</h1>
          {notifications.some((n) => !n.isRead) && (
            <button className="mark-all-btn" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>

        <div className="notifications-list">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                onClick={() => markAsRead(notification.id)}
              >
                {/* New wrapper for the 3D dot area */}
                <div className="notification-icon-area">
                  <div className="status-dot"></div>
                </div>

                <div className="notification-content">
                  <div className="notification-top">
                    <span className="notification-title">
                      {notification.title}
                    </span>
                    <span className="notification-time">
                      {notification.time}
                    </span>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-notifications fade-in">
              <p>You have no notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
