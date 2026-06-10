import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as syncService from "../../api/syncService";
import Toast from "../../components/Toast";
import "./Sync.css";

export default function SyncAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const [syncStatus, setSyncStatus] = useState(null);
  const [failedTransfers, setFailedTransfers] = useState([]);
  const [unanchoredProducts, setUnanchoredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchSyncData();
  }, []);

  const fetchSyncData = async () => {
    try {
      setLoading(true);
      const [statusRes, failedRes, unanchoredRes] = await Promise.all([
        syncService.getSyncStatus(),
        syncService.getFailedTransfers(),
        syncService.getUnanchoredProducts(),
      ]);

      setSyncStatus(statusRes);
      setFailedTransfers(failedRes.transfers || []);
      setUnanchoredProducts(unanchoredRes.products || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load sync data");
      console.error("Sync data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerManualSync = async () => {
    try {
      setTriggering(true);
      await syncService.triggerManualSync();
      setToast({
        message: "✅ Sync triggered! Jobs are running...",
        type: "success",
      });
      setTimeout(() => fetchSyncData(), 1000);
    } catch (err) {
      setToast({
        message:
          "❌ " + (err.response?.data?.error || "Failed to trigger sync"),
        type: "error",
      });
    } finally {
      setTriggering(false);
    }
  };

  const handleRetryTransfer = async (transferId) => {
    try {
      await syncService.retryFailedTransfer(transferId);
      setToast({
        message: "✅ Transfer retry queued",
        type: "success",
      });
      setTimeout(() => fetchSyncData(), 500);
    } catch (err) {
      setToast({
        message: "❌ " + (err.response?.data?.error || "Retry failed"),
        type: "error",
      });
    }
  };

  const handleRetryProduct = async (productId) => {
    try {
      await syncService.retrySingleProduct(productId);
      setToast({
        message: "✅ Product retry queued",
        type: "success",
      });
      setTimeout(() => fetchSyncData(), 500);
    } catch (err) {
      setToast({
        message: "❌ " + (err.response?.data?.error || "Retry failed"),
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="sync-container">
        <div className="loading-spinner">Loading sync panel...</div>
      </div>
    );
  }

  return (
    <div className="sync-container">
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} className="btn-dismiss">
            ✕
          </button>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="sync-header">
        <h1>⚙️ Sync Admin Panel</h1>
        <p className="sync-subtitle">
          Monitor and manage blockchain synchronization jobs
        </p>
      </div>

      {/* Stat Cards */}
      {syncStatus && (
        <div className="sync-stats-grid">
          <div className="stat-card">
            <div className="stat-label">Pending Syncs</div>
            <div className="stat-value pending">{syncStatus.pending || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed Syncs</div>
            <div className="stat-value failed">{syncStatus.failed || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Exhausted Retries</div>
            <div className="stat-value exhausted">
              {syncStatus.exhausted || 0}
            </div>
          </div>
          <div className="stat-card">
            <button
              onClick={handleTriggerManualSync}
              disabled={triggering}
              className="btn-trigger"
            >
              {triggering ? "⏳ Running..." : "▶ Trigger Manual Sync"}
            </button>
          </div>
        </div>
      )}

      {/* Failed Transfers Section */}
      <div className="sync-section">
        <h2>📤 Failed Transfers</h2>
        {failedTransfers.length === 0 ? (
          <div className="empty-state">
            No failed transfers. All syncs are healthy! ✓
          </div>
        ) : (
          <div className="transfer-list">
            {failedTransfers.map((transfer) => (
              <div key={transfer._id} className="transfer-card">
                <div className="transfer-header">
                  <div className="transfer-product">
                    <strong>{transfer.product?.name}</strong> (
                    {transfer.product?.sku})
                  </div>
                  <span className={`retry-badge retry-${transfer.retryCount}`}>
                    Retries: {transfer.retryCount || 0}
                  </span>
                </div>
                <div className="transfer-body">
                  <div className="transfer-row">
                    <label>From → To:</label>
                    <span>
                      {transfer.fromUser?.email?.substring(0, 12)}... →{" "}
                      {transfer.toUser?.email?.substring(0, 12)}...
                    </span>
                  </div>
                  <div className="transfer-row">
                    <label>Error:</label>
                    <code className="error-code">
                      {transfer.lastError || "Unknown error"}
                    </code>
                  </div>
                  <div className="transfer-row">
                    <label>Last Attempt:</label>
                    <span>
                      {transfer.lastAttemptAt
                        ? new Date(transfer.lastAttemptAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>
                <div className="transfer-actions">
                  <button
                    onClick={() => handleRetryTransfer(transfer._id)}
                    className="btn-retry"
                  >
                    🔄 Retry
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unanchored Products Section */}
      <div className="sync-section">
        <h2>📦 Unanchored Products</h2>
        {unanchoredProducts.length === 0 ? (
          <div className="empty-state">
            All products are anchored on-chain! ✓
          </div>
        ) : (
          <div className="product-list">
            {unanchoredProducts.map((product) => (
              <div key={product._id} className="product-card">
                <div className="product-header">
                  <div className="product-info">
                    <strong>{product.name}</strong>
                    <span className="sku">{product.sku}</span>
                  </div>
                  <span className="time-badge">
                    Created {new Date(product.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="product-body">
                  <p className="product-description">
                    {product.description || "No description"}
                  </p>
                  <div className="product-meta">
                    <span>
                      Owner: {product.owner?.email?.substring(0, 12)}...
                    </span>
                    <span>
                      Status:{" "}
                      {product.contentHash ? "Hash computed" : "Pending hash"}
                    </span>
                  </div>
                </div>
                <div className="product-actions">
                  <button
                    onClick={() => handleRetryProduct(product._id)}
                    className="btn-retry"
                  >
                    ⛓ Retry Single
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="sync-footer-info">
        <p>
          💡 <strong>Tip:</strong> Sync jobs run automatically in the
          background. Use "Trigger Manual Sync" to immediately process pending
          jobs. Check back in 30 seconds to see updates.
        </p>
      </div>
    </div>
  );
}
