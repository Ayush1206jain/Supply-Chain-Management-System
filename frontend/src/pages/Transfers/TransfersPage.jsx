import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { listProducts } from "../../api/productService";
import { createTransfer, getTransfersByProduct } from "../../api/transferService";
import "./Transfers.css";

/**
 * TransfersPage — Day 14
 * - Manufacturer / Distributor / Admin can initiate ownership transfers.
 * - All authenticated users can view transfer history per product.
 * - Timeline visualization with blockchain sync status.
 */
export default function TransfersPage() {
  const { user } = useAuth();
  // Retailers can only view history, not initiate transfers
  const canTransfer = user?.role !== "retailer";

  const [products, setProducts]     = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ── Transfer form state ────────────────────────────────────────────
  const [form, setForm] = useState({ productId: "", toUserId: "" });
  const [formError, setFormError]     = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // ── History state ──────────────────────────────────────────────────
  const [historyProductId, setHistoryProductId] = useState("");
  const [transfers, setTransfers]               = useState([]);
  const [loadingHistory, setLoadingHistory]     = useState(false);
  const [historyError, setHistoryError]         = useState("");

  // ── Fetch product list for dropdowns ──────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setLoadingProducts(true);
        const data = await listProducts();
        setProducts(data.products ?? []);
      } catch {
        // silently fail — user sees empty dropdowns
      } finally {
        setLoadingProducts(false);
      }
    }
    load();
  }, []);

  // ── Fetch history when product selection changes ───────────────────
  const fetchHistory = useCallback(async (productId) => {
    if (!productId) { setTransfers([]); return; }
    try {
      setLoadingHistory(true);
      setHistoryError("");
      const data = await getTransfersByProduct(productId);
      setTransfers(data.transfers ?? []);
    } catch (err) {
      setHistoryError(err.response?.data?.message || "Failed to load transfer history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(historyProductId);
  }, [historyProductId, fetchHistory]);

  // ── Form handlers ────────────────────────────────────────────────
  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.productId) { setFormError("Please select a product."); return; }
    if (!form.toUserId.trim()) { setFormError("Recipient User ID is required."); return; }

    try {
      setSubmitting(true);
      const res = await createTransfer({
        productId: form.productId,
        toUserId: form.toUserId.trim(),
      });
      const status = res.transfer?.syncStatus ?? "pending";
      setFormSuccess(
        `✅ Transfer initiated! Blockchain sync: ${status}. History will update below.`
      );
      setForm({ productId: "", toUserId: "" });

      // Refresh history if user is viewing the transferred product
      if (historyProductId === form.productId) {
        await fetchHistory(historyProductId);
      }
      setTimeout(() => setFormSuccess(""), 5000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Transfer failed. Check your inputs.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="transfers-page animate-fade-in" id="transfers-page">
      <h1 className="transfers-title">🔄 Ownership Transfers</h1>

      {/* Role notice for retailers */}
      {!canTransfer && (
        <div className="transfers-notice">
          ℹ️ <strong>Retailers</strong> cannot initiate transfers. You can view transfer
          history for any product using the selector below.
        </div>
      )}

      {/* ── Transfer form ─────────────────────────────────────────── */}
      {canTransfer && (
        <div className="transfer-panel" id="transfer-form-panel">
          <div className="transfer-panel-header">
            <span className="transfer-panel-icon">↗️</span>
            <h2 className="transfer-panel-title">Initiate Transfer</h2>
          </div>

          {formError && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              ⚠️ {formError}
            </div>
          )}
          {formSuccess && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              {formSuccess}
            </div>
          )}

          <form className="transfer-form" onSubmit={handleSubmit} noValidate>
            <div className="transfer-form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="select-product">
                  Product *
                </label>
                <select
                  id="select-product"
                  className="form-input form-select"
                  name="productId"
                  value={form.productId}
                  onChange={handleChange}
                  disabled={loadingProducts}
                >
                  <option value="">
                    {loadingProducts ? "Loading products…" : "— Select a product —"}
                  </option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-to-user">
                  Recipient User ID *
                </label>
                <input
                  id="input-to-user"
                  className="form-input"
                  name="toUserId"
                  placeholder="MongoDB ObjectId of recipient"
                  value={form.toUserId}
                  onChange={handleChange}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="form-error" style={{ color: "var(--clr-text-muted)", fontSize: "var(--font-size-xs)" }}>
                  Obtain the recipient's user ID from the admin panel or registration receipt.
                </span>
              </div>
            </div>

            <div className="transfer-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="btn-initiate-transfer"
                disabled={submitting || loadingProducts}
              >
                {submitting
                  ? <><span className="spinner" /> Transferring…</>
                  : "⛓ Transfer Ownership"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Transfer history ──────────────────────────────────────── */}
      <div id="transfer-history-section">
        <div className="history-section-header">
          <h2 className="history-section-title">Transfer History</h2>
          <div className="history-product-selector">
            <label htmlFor="history-select">View history for:</label>
            <select
              id="history-select"
              className="form-input form-select"
              value={historyProductId}
              onChange={(e) => setHistoryProductId(e.target.value)}
              disabled={loadingProducts}
            >
              <option value="">— Select a product —</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* No product selected */}
        {!historyProductId && (
          <div className="transfers-empty">
            <span className="transfers-empty-icon">🔍</span>
            <p>Select a product above to view its ownership timeline.</p>
          </div>
        )}

        {/* Loading */}
        {historyProductId && loadingHistory && (
          <div className="page-center" style={{ padding: "40px 0" }}>
            <div className="spinner spinner-lg" />
          </div>
        )}

        {/* Error */}
        {historyError && (
          <div className="alert alert-error">{historyError}</div>
        )}

        {/* Empty history */}
        {historyProductId && !loadingHistory && !historyError && transfers.length === 0 && (
          <div className="transfers-empty">
            <span className="transfers-empty-icon">📭</span>
            <p>No transfers recorded for this product yet.</p>
          </div>
        )}

        {/* Timeline */}
        {!loadingHistory && transfers.length > 0 && (
          <div className="transfer-timeline stagger" id="transfer-timeline">
            {transfers.map((t, i) => (
              <TransferTimelineItem key={t._id} transfer={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Individual timeline item */
function TransferTimelineItem({ transfer, index }) {
  const status = transfer.syncStatus ?? "pending";
  const statusIcon = status === "confirmed" ? "✅" : status === "failed" ? "❌" : "⏳";

  return (
    <div
      className="timeline-item"
      id={`timeline-${transfer._id}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`timeline-dot ${status}`}>{statusIcon}</div>
      <div className="timeline-body">
        <div className="timeline-from-to">
          <span className="timeline-user" title={transfer.fromUser?.email}>
            {transfer.fromUser?.email ?? transfer.fromUser ?? "Unknown"}
          </span>
          <span className="timeline-arrow">→</span>
          <span className="timeline-user" title={transfer.toUser?.email}>
            {transfer.toUser?.email ?? transfer.toUser ?? "Unknown"}
          </span>
        </div>
        <div className="timeline-meta">
          <span className="timeline-date">
            {new Date(transfer.createdAt).toLocaleString()}
          </span>
          <span className={`timeline-status ${status}`}>
            ⛓ {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {transfer.blockchainTxHash && (
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--clr-text-muted)",
                fontFamily: "monospace",
              }}
              title={transfer.blockchainTxHash}
            >
              Tx: {transfer.blockchainTxHash.slice(0, 10)}…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
