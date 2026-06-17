import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { listProducts } from "../../api/productService";
import {
  createTransfer,
  confirmTransfer,
  getPendingTransfersForMe,
  getTransfersByProduct,
} from "../../api/transferService";
import { reportDispute, getMyDisputes } from "../../api/disputeService";
import { listUsers } from "../../api/userService";
import { useScrollVisibility } from "../../hooks/useScrollVisibility";
import "./Transfers.css";

const NEXT_RECIPIENT_ROLE = {
  manufacturer: "distributor",
  distributor: "retailer",
};

function sameId(a, b) {
  return a?.toString?.() === b?.toString?.();
}

function productLabel(product) {
  if (!product) return "Unknown product";
  return `${product.name} (${product.sku})`;
}

export default function TransfersPage() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const recipientRole = NEXT_RECIPIENT_ROLE[user?.role];
  const canTransfer = Boolean(recipientRole) || user?.role === "admin";

  const [products, setProducts] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const isFooterVisible = useScrollVisibility();
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);

  const [form, setForm] = useState({ productId: "", toUserId: "" });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");

  // ── Report-stolen state ────────────────────────────────────────────────────
  const [reportingFor, setReportingFor] = useState(null); // the transfer object
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [myReports, setMyReports] = useState([]); // to show existing report badge

  const [historyProductId, setHistoryProductId] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const ownedProducts = useMemo(() => {
    if (user?.role === "admin") return products;
    return products.filter((product) => {
      const ownerId = product.owner?._id || product.owner?.id || product.owner;
      return sameId(ownerId, userId);
    });
  }, [products, user?.role, userId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === form.productId),
    [products, form.productId]
  );

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await listProducts();
      setProducts(data.products ?? []);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadPendingTransfers = useCallback(async () => {
    try {
      setLoadingPending(true);
      const data = await getPendingTransfersForMe("me");
      setPendingTransfers(data.transfers ?? []);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const loadMyReports = useCallback(async () => {
    try {
      const data = await getMyDisputes();
      setMyReports(data.reports ?? []);
    } catch {
      /* non-critical */ 
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadPendingTransfers();
    loadMyReports();
  }, [loadProducts, loadPendingTransfers, loadMyReports]);

  useEffect(() => {
    async function loadRecipients() {
      if (!canTransfer) return;
      try {
        setLoadingRecipients(true);
        const params = recipientRole ? { role: recipientRole } : {};
        const data = await listUsers(params);
        setRecipients((data.users ?? []).filter((candidate) => !sameId(candidate._id, userId)));
      } catch {
        setRecipients([]);
      } finally {
        setLoadingRecipients(false);
      }
    }

    loadRecipients();
  }, [canTransfer, recipientRole, userId]);

  const fetchHistory = useCallback(async (productId) => {
    if (!productId) {
      setTransfers([]);
      return;
    }
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

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function refreshTransferState(productId = historyProductId) {
    await Promise.all([loadProducts(), loadPendingTransfers()]);
    if (productId) await fetchHistory(productId);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.productId) {
      setFormError("Please select one of your products.");
      return;
    }
    if (!form.toUserId) {
      setFormError("Please select a recipient.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createTransfer({
        productId: form.productId,
        toUserId: form.toUserId,
      });
      const recipient = recipients.find((item) => item._id === form.toUserId);
      setFormSuccess(
        `Transfer sent to ${recipient?.email || "recipient"} for confirmation. Sync: ${res.blockchainSyncStatus}.`
      );
      const transferredProductId = form.productId;
      setForm({ productId: "", toUserId: "" });
      await refreshTransferState(transferredProductId);
      setTimeout(() => setFormSuccess(""), 5000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Transfer failed. Please check your selection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(transferId, productId) {
    setFormError("");
    setFormSuccess("");
    try {
      setConfirmingId(transferId);
      await confirmTransfer(transferId);
      setFormSuccess("Transfer confirmed. You are now the product owner.");
      await refreshTransferState(productId);
      setTimeout(() => setFormSuccess(""), 5000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to confirm transfer.");
    } finally {
      setConfirmingId("");
    }
  }

  // ── Report-stolen handlers ──────────────────────────────────────────────────
  function openReportModal(transfer) {
    setReportingFor(transfer);
    setReportReason("");
    setReportError("");
    setReportSuccess("");
  }

  function closeReportModal() {
    setReportingFor(null);
    setReportReason("");
    setReportError("");
    setReportSuccess("");
  }

  async function handleReport(e) {
    e.preventDefault();
    if (!reportReason.trim()) {
      setReportError("Please provide a reason for the report.");
      return;
    }
    setReportSubmitting(true);
    setReportError("");
    try {
      await reportDispute({
        productId: reportingFor.product?._id || reportingFor.product,
        reason: reportReason.trim(),
      });
      setReportSuccess("Report filed. An admin will review it shortly.");
      await loadMyReports(); // refresh badge
      setTimeout(closeReportModal, 2500);
    } catch (err) {
      setReportError(err.response?.data?.message || "Failed to file report.");
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <div className={`transfers-page animate-fade-in ${!canTransfer ? "retailer-view" : ""}`} id="transfers-page">
      <h1 className="transfers-title">
        <svg className="title-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3l4 4-4 4" />
          <path d="M3 7h18" />
          <path d="M7 21l-4-4 4-4" />
          <path d="M21 17H3" />
        </svg>
        Ownership Transfers
      </h1>

      {!canTransfer && (
        <div className="transfers-notice">
          Your role can receive and confirm transfers. Use the pending section below when another owner sends you a product.
        </div>
      )}

      {(formError || formSuccess) && (
        <div className={`alert ${formError ? "alert-error" : "alert-success"}`} style={{ marginBottom: 16 }}>
          {formError || formSuccess}
        </div>
      )}

      <PendingTransfersPanel
        pendingTransfers={pendingTransfers}
        loading={loadingPending}
        confirmingId={confirmingId}
        onConfirm={handleConfirm}
        onReport={openReportModal}
        myReports={myReports}
      />

      {/* ── Report-Stolen Modal ── */}
      {reportingFor && (
        <ReportStolenModal
          transfer={reportingFor}
          reason={reportReason}
          onReasonChange={setReportReason}
          onSubmit={handleReport}
          onClose={closeReportModal}
          submitting={reportSubmitting}
          error={reportError}
          success={reportSuccess}
        />
      )}

      <div className="transfers-content-layout">
        {canTransfer && (
          <div className="transfers-left-col">
            <div className="transfer-panel" id="transfer-form-panel">
              <div className="transfer-panel-header">
                <span className="transfer-panel-icon">-&gt;</span>
                <h2 className="transfer-panel-title">Initiate Transfer</h2>
              </div>

              <form className="transfer-form" onSubmit={handleSubmit} noValidate>
                <div className="transfer-form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="select-product">Product *</label>
                    <select
                      id="select-product"
                      className="form-input form-select"
                      name="productId"
                      value={form.productId}
                      onChange={handleChange}
                      disabled={loadingProducts}
                    >
                      <option value="">
                        {loadingProducts ? "Loading products..." : "Select a product you own"}
                      </option>
                      {ownedProducts.map((product) => (
                        <option key={product._id} value={product._id}>
                          {productLabel(product)}
                        </option>
                      ))}
                    </select>
                    {!loadingProducts && ownedProducts.length === 0 && (
                      <span className="form-hint">You do not currently own any transferable products.</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="select-recipient">Recipient *</label>
                    <select
                      id="select-recipient"
                      className="form-input form-select"
                      name="toUserId"
                      value={form.toUserId}
                      onChange={handleChange}
                      disabled={loadingRecipients}
                    >
                      <option value="">
                        {loadingRecipients ? "Loading recipients..." : "Select recipient"}
                      </option>
                      {recipients.map((recipient) => (
                        <option key={recipient._id} value={recipient._id}>
                          {recipient.name} - {recipient.email} ({recipient.role})
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">
                      {recipientRole
                        ? `Showing registered ${recipientRole}s.`
                        : "Admins can transfer to any registered user."}
                    </span>
                  </div>
                </div>

                <div className="transfer-form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    id="btn-initiate-transfer"
                    disabled={submitting || loadingProducts || loadingRecipients || !selectedProduct}
                  >
                    {submitting ? <><span className="spinner" /> Sending...</> : "Submit Transfer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="transfers-right-col" id="transfer-history-section">
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
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {productLabel(product)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="history-scroll-container">
            {!historyProductId && (
              <div className="transfers-empty">
                <span className="transfers-empty-icon">?</span>
                <p>Select a product above to view its ownership timeline.</p>
              </div>
            )}

            {historyProductId && loadingHistory && (
              <div className="page-center" style={{ padding: "40px 0" }}>
                <div className="spinner spinner-lg" />
              </div>
            )}

            {historyError && <div className="alert alert-error">{historyError}</div>}

            {historyProductId && !loadingHistory && !historyError && transfers.length === 0 && (
              <div className="transfers-empty">
                <span className="transfers-empty-icon">[]</span>
                <p>No transfers recorded for this product yet.</p>
              </div>
            )}

            {!loadingHistory && transfers.length > 0 && (
              <div className="transfer-timeline stagger" id="transfer-timeline">
                {transfers.map((transfer, index) => (
                  <TransferTimelineItem
                    key={transfer._id}
                    transfer={transfer}
                    index={index}
                    myReports={myReports}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="transfers-decorations">
        <img src="/assets/icons/transfer.png" alt="Transfer" className="decor-icon-trans decor-transfer" />
        <img src="/assets/icons/ownership.png" alt="Ownership" className="decor-icon-trans decor-ownership" />
        <img src="/assets/icons/blockchain.png" alt="Blockchain" className="decor-icon-trans decor-blockchain" />
      </div>

      <footer className={`transfers-footer-quote ${isFooterVisible ? "" : "hide"}`}>
        <div className="quote-text-container">
          <span className="quote-text">Transparent transfers. Verified ownership. Immutable records.</span>
          <svg className="quote-hollow-block" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
      </footer>
    </div>
  );
}

function PendingTransfersPanel({ pendingTransfers, loading, confirmingId, onConfirm, onReport, myReports }) {
  /**
   * Build a map: productId → report status
   * We lock the buttons for BOTH "pending" (awaiting admin review)
   * and "flagged" (admin confirmed on-chain = product is DISPUTED).
   * Only "rejected" (admin dismissed) re-enables the buttons.
   */
  const reportedStatusMap = {};
  (myReports || []).forEach((r) => {
    if (r.status === "pending" || r.status === "flagged") {
      const pid = (r.product?._id || r.product)?.toString();
      if (pid) reportedStatusMap[pid] = r.status;
    }
  });

  function badgeForStatus(status) {
    if (status === "flagged") {
      return (
        <span className="dispute-reported-badge dispute-flagged-badge">
          🔴 Flagged DISPUTED (Stolen / Counterfeit) — Transfer Blocked
        </span>
      );
    }
    return (
      <span className="dispute-reported-badge">
        🚨 Stolen / Counterfeit Report — Pending Admin Review
      </span>
    );
  }

  return (
    <div className="pending-transfer-panel">
      <div className="pending-transfer-header">
        <h2>Pending Inbound Transfers</h2>
        <span>{loading ? "Loading..." : `${pendingTransfers.length} pending`}</span>
      </div>

      {!loading && pendingTransfers.length === 0 && (
        <p className="pending-transfer-empty">No products are waiting for your confirmation.</p>
      )}

      {pendingTransfers.length > 0 && (
        <div className="pending-transfer-list">
          {pendingTransfers.map((transfer) => {
            const product = transfer.product;
            const productId = product?._id || product;
            const disputeStatus = reportedStatusMap[productId?.toString()]; // "pending" | "flagged" | undefined
            const isLocked = Boolean(disputeStatus); // true for pending or flagged
            return (
              <div className="pending-transfer-item" key={transfer._id}>
                <div className="pending-transfer-info">
                  <strong>{productLabel(product)}</strong>
                  <span>From {transfer.fromUser?.email || "Unknown sender"}</span>
                  {isLocked && badgeForStatus(disputeStatus)}
                </div>
                <div className="pending-transfer-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onConfirm(transfer._id, productId)}
                    disabled={confirmingId === transfer._id || isLocked}
                    title={
                      disputeStatus === "flagged"
                        ? "This product is DISPUTED on-chain — transfers are blocked"
                        : disputeStatus === "pending"
                        ? "Cannot confirm while a dispute report is under review"
                        : undefined
                    }
                  >
                    {confirmingId === transfer._id ? <><span className="spinner" /> Confirming...</> : "Confirm Transfer"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-dispute"
                    onClick={() => onReport(transfer)}
                    disabled={isLocked}
                    title={
                      disputeStatus === "flagged"
                        ? "Product is already flagged as DISPUTED on-chain"
                        : disputeStatus === "pending"
                        ? "Already reported — awaiting admin review"
                        : "Report this product as stolen or counterfeit"
                    }
                  >
                    {disputeStatus === "flagged"
                      ? "🔴 DISPUTED"
                      : disputeStatus === "pending"
                      ? "🚨 Reported"
                      : "⚠️ Report Stolen / Counterfeit"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function TransferTimelineItem({ transfer, index, myReports }) {
  const confirmedByReceiver = Boolean(transfer.receiverConfirmed);
  const syncStatus = transfer.syncStatus ?? "pending";
  const displayStatus = confirmedByReceiver ? "confirmed" : "pending";
  const statusIcon = confirmedByReceiver ? "OK" : "...";

  // Look up dispute status for this transfer's product
  const productId = (transfer.product?._id || transfer.product)?.toString();
  const disputeReport = (myReports || []).find(
    (r) => (r.product?._id || r.product)?.toString() === productId
  );
  const disputeStatus = disputeReport?.status; // "pending" | "flagged" | "rejected" | undefined

  function formatUser(user) {
    if (!user) return "Unknown";
    const name = user.name || user.email || "Unknown";
    const role = user.role ? ` (${user.role})` : "";
    return `${name}${role}`;
  }

  return (
    <div
      className={`timeline-item${disputeStatus === "flagged" ? " timeline-item-disputed" : ""}`}
      id={`timeline-${transfer._id}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`timeline-dot ${disputeStatus === "flagged" ? "disputed" : displayStatus}`}>
        {disputeStatus === "flagged" ? "!" : statusIcon}
      </div>
      <div className="timeline-body">
        <div className="timeline-from-to">
          <span className="timeline-user" title={transfer.fromUser?.email}>
            {formatUser(transfer.fromUser)}
          </span>
          <span className="timeline-arrow">-&gt;</span>
          <span className="timeline-user" title={transfer.toUser?.email}>
            {formatUser(transfer.toUser)}
          </span>
        </div>
        <div className="timeline-meta">
          <span className="timeline-date">
            <span className="timeline-label">Transferred on:</span>{" "}
            {new Date(transfer.createdAt).toLocaleString()}
          </span>
          <span className={`timeline-status ${displayStatus}`}>
            <span className="timeline-label">Receiver Status:</span>{" "}
            {confirmedByReceiver ? "Confirmed" : "Awaiting confirmation"}
          </span>
          <span className={`timeline-status ${syncStatus}`}>
            <span className="timeline-label">Blockchain:</span>{" "}
            {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
          </span>
          {transfer.blockchainTxHash && (
            <span className="timeline-tx" title={transfer.blockchainTxHash}>
              <span className="timeline-label">Tx Hash:</span>{" "}
              {transfer.blockchainTxHash.slice(0, 10)}...
            </span>
          )}
          {/* ── Dispute status row ── */}
          {disputeStatus === "flagged" && (
            <span className="timeline-status timeline-status-disputed">
              <span className="timeline-label">Dispute:</span>{" "}
              🔴 Flagged DISPUTED — Stolen / Counterfeit — Transfer Blocked
            </span>
          )}
          {disputeStatus === "pending" && (
            <span className="timeline-status timeline-status-dispute-pending">
              <span className="timeline-label">Dispute:</span>{" "}
              🚨 Stolen / Counterfeit Report — Awaiting Admin Review
            </span>
          )}
          {disputeStatus === "rejected" && (
            <span className="timeline-status timeline-status-dispute-rejected">
              <span className="timeline-label">Dispute:</span>{" "}
              ✅ Report Dismissed by Admin
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Report Stolen Modal ──────────────────────────────────────────────────────
function ReportStolenModal({ transfer, reason, onReasonChange, onSubmit, onClose, submitting, error, success }) {
  const product = transfer?.product;

  return (
    <div className="dispute-modal-overlay" onClick={onClose}>
      <div className="dispute-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dispute-modal-header">
          <span className="dispute-modal-icon">🚨</span>
          <div>
            <h2 className="dispute-modal-title">Report Stolen / Counterfeit</h2>
            <p className="dispute-modal-subtitle">
              {product ? `${product.name || ""} (${product.sku || ""})` : "Product"}
            </p>
          </div>
          <button className="dispute-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="dispute-modal-info">
          <span className="dispute-info-icon">ℹ️</span>
          <p>
            Filing a report notifies the <strong>Admin</strong>, who can investigate and
            flag this product as <strong>DISPUTED</strong> on the blockchain. Once flagged,
            further transfers are blocked until resolved.
          </p>
        </div>

        {success ? (
          <div className="alert alert-success dispute-alert">{success}</div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="dispute-reason">
                Reason for Report <span style={{ color: 'var(--clr-danger)' }}>*</span>
              </label>
              <textarea
                id="dispute-reason"
                className="form-input dispute-textarea"
                rows={4}
                maxLength={1000}
                placeholder="Describe what happened — e.g. 'I received an empty package (stolen)', 'Product appears counterfeit — packaging and serial mismatch', 'I did not initiate this transfer'..."
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                disabled={submitting}
                required
              />
              <span className="form-hint">{reason.length}/1000 characters</span>
            </div>

            {error && <div className="alert alert-error dispute-alert">{error}</div>}

            <div className="dispute-modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                id="btn-submit-dispute"
                type="submit"
                className="btn btn-danger"
                disabled={submitting || !reason.trim()}
              >
                {submitting ? <><span className="spinner" /> Filing Report...</> : '🚨 File Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
