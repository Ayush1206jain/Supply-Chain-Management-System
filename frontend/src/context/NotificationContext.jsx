import { createContext, useContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      // User logged out — disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to Socket.io with JWT auth
    const token = localStorage.getItem("token");
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("notification", (notification) => {
      console.log("Notification received:", notification);

      // Add to list (newest first)
      setNotifications((prev) => {
        let updated = [...prev];

        // If this is a confirmation, resolve any pending actions for this product
        if (notification.type === "TRANSFER_CONFIRMED") {
          updated = updated.map((n) => {
            if (
              n.productId === notification.productId &&
              n.type === "TRANSFER_PENDING_CONFIRMATION"
            ) {
              return { ...n, read: true, actionRequired: false };
            }
            return n;
          });
        }

        return [
          { ...notification, id: Date.now(), read: false },
          ...updated.slice(0, 49), // keep max 50 notifications
        ];
      });

      // Show browser notification if tab is in background
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        document.hidden &&
        Notification.permission === "granted"
      ) {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });

    socketRef.current = socket;

    // Request browser notification permission
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]); // reconnect when user changes

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
