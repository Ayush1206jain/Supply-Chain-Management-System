import { useEffect } from "react";
import "./Toast.css";

export default function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        {type === "success" && <span className="toast-icon">✓</span>}
        {type === "error" && <span className="toast-icon">✕</span>}
        {type === "warning" && <span className="toast-icon">⚠</span>}
        {type === "info" && <span className="toast-icon">ℹ</span>}
        <span className="toast-message">{message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="toast-close"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
