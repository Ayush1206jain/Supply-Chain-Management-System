import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import "./NotificationBell.css";

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    markRead(notification.id);
    setOpen(false);
    // Navigate to relevant page based on notification type
    if (notification.productId) {
      if (notification.type === "TRANSFER_PENDING_CONFIRMATION") {
        navigate("/transfers");
      } else {
        navigate(`/audit/${notification.productId}`);
      }
    }
  };

  const getIcon = (type) => {
    const icons = {
      PRODUCT_REGISTERED: "📦",
      TRANSFER_PENDING_CONFIRMATION: "⏳",
      TRANSFER_CONFIRMED: "✅",
      DISPUTE_RAISED: "⚠️",
      USER_REGISTERED: "👤",
    };
    return icons[type] || "🔔";
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        className={`bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) markAllRead();
        }}
        title="Notifications"
        id="notification-bell-button"
      >
        <span className="bell-emoji">🔔</span>
        {unreadCount > 0 && (
          <span className="unread-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" id="notification-dropdown-menu">
          <div className="notification-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button className="clear-btn" onClick={() => { clearAll(); setOpen(false); }}>
                Clear all
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.read ? "unread" : ""} ${n.urgent ? "urgent" : ""}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="notification-icon">{getIcon(n.type)}</span>
                  <div className="notification-content">
                    <div className="notification-title">{n.title}</div>
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-time">{formatTime(n.timestamp)}</div>
                  </div>
                  {n.actionRequired && (
                    <span className="action-badge">Action needed</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
