import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getSyncStatus,
  triggerSync,
  getFailedTransfers,
  getUnanchoredProducts,
} from '../../api/syncService';
import {
  listDisputes,
  flagDisputeReport,
  rejectDisputeReport,
} from '../../api/disputeService';
import './Sync.css';

/**
 * SyncPage — Day 15
 * Admin-only control panel for blockchain sync monitoring:
 *  - Live sync status counters
 *  - Manual trigger retry pass
 *  - Paginated failed transfers table
 *  - Paginated unanchored products table
 */
export default function SyncPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Status state
  const [status, setStatus]         = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError]     = useState('');

  // Trigger state
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  // Failed transfers
  const [failedTx, setFailedTx]     = useState([]);
  const [failedPage, setFailedPage] = useState(1);
  const [failedTotal, setFailedTotal] = useState(0);
  const [failedLoading, setFailedLoading] = useState(false);

  // Unanchored products
  const [unanchored, setUnanchored]   = useState([]);
  const [unanchoredPage, setUnanchoredPage] = useState(1);
  const [unanchoredTotal, setUnanchoredTotal] = useState(0);
  const [unanchoredLoading, setUnanchoredLoading] = useState(false);

  // Dispute reports
  const [disputes, setDisputes]             = useState([]);
  const [disputeTotal, setDisputeTotal]     = useState(0);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeAction, setDisputeAction]   = useState(''); // reportId being acted on
  const [disputeResult, setDisputeResult]   = useState(null);

  const PAGE_SIZE = 5;

  // ── Fetch sync status ──────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const data = await getSyncStatus();
      setStatus(data.syncStatus || data);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Failed to fetch sync status.');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // ── Fetch failed transfers ────────────────────────────────────
  const fetchFailed = useCallback(async (page) => {
    if (!isAdmin) return;
    setFailedLoading(true);
    try {
      const data = await getFailedTransfers(page, PAGE_SIZE);
      setFailedTx(data.transfers || data.data || []);
      setFailedTotal(data.total || 0);
    } catch {
      setFailedTx([]);
    } finally {
      setFailedLoading(false);
    }
  }, [isAdmin]);

  // ── Fetch unanchored products ─────────────────────────────────
  const fetchUnanchored = useCallback(async (page) => {
    if (!isAdmin) return;
    setUnanchoredLoading(true);
    try {
      const data = await getUnanchoredProducts(page, PAGE_SIZE);
      setUnanchored(data.products || data.data || []);
      setUnanchoredTotal(data.total || 0);
    } catch {
      setUnanchored([]);
    } finally {
      setUnanchoredLoading(false);
    }
  }, [isAdmin]);

  // ── Fetch pending dispute reports ─────────────────────────────
  const fetchDisputes = useCallback(async () => {
    if (!isAdmin) return;
    setDisputeLoading(true);
    try {
      const data = await listDisputes({ status: 'pending', limit: 20 });
      setDisputes(data.reports || []);
      setDisputeTotal(data.total || 0);
    } catch {
      setDisputes([]);
    } finally {
      setDisputeLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchFailed(failedPage);
  }, [fetchFailed, failedPage]);

  useEffect(() => {
    fetchUnanchored(unanchoredPage);
  }, [fetchUnanchored, unanchoredPage]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // ── Trigger retry pass ────────────────────────────────────────
  async function handleTrigger() {
    if (!isAdmin) return;
    setTriggering(true);
    setTriggerResult(null);
    try {
      const result = await triggerSync();
      setTriggerResult({ ok: true, data: result });
      // Refresh all panels
      await fetchStatus();
      await fetchFailed(failedPage);
      await fetchUnanchored(unanchoredPage);
    } catch (err) {
      setTriggerResult({ ok: false, msg: err.response?.data?.message || 'Trigger failed.' });
    } finally {
      setTriggering(false);
    }
  }

  // ── Flag dispute on-chain ─────────────────────────────────────
  async function handleFlagDispute(reportId) {
    setDisputeAction(reportId);
    setDisputeResult(null);
    try {
      const res = await flagDisputeReport(reportId);
      setDisputeResult({ ok: true, msg: res.message, txHash: res.blockchainTxHash });
      await fetchDisputes();
    } catch (err) {
      setDisputeResult({ ok: false, msg: err.response?.data?.message || 'Flag action failed.' });
    } finally {
      setDisputeAction('');
    }
  }

  // ── Reject dispute report ─────────────────────────────────────
  async function handleRejectDispute(reportId) {
    setDisputeAction(reportId);
    setDisputeResult(null);
    try {
      const res = await rejectDisputeReport(reportId);
      setDisputeResult({ ok: true, msg: res.message });
      await fetchDisputes();
    } catch (err) {
      setDisputeResult({ ok: false, msg: err.response?.data?.message || 'Reject action failed.' });
    } finally {
      setDisputeAction('');
    }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  function shortHash(h) {
    if (!h) return '—';
    return h.length > 20 ? `${h.slice(0, 8)}…${h.slice(-8)}` : h;
  }

  const totalPages = (total) => Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="sync-page">
      {/* ── Header ── */}
      <div className="sync-header">
        <div className="sync-header-icon">🔗</div>
        <div>
          <h1 className="sync-title">Blockchain Sync Status</h1>
          <p className="sync-subtitle">
            {isAdmin
              ? 'Monitor and manage blockchain synchronization for all products and transfers.'
              : 'View the current blockchain sync health across the system.'}
          </p>
        </div>
      </div>

      {/* ── Access notice for non-admins ── */}
      {!isAdmin && (
        <div className="alert alert-error sync-access-notice" id="sync-access-notice">
          🔒 The detailed controls below are visible to admins only. You can view the status counters.
        </div>
      )}

      {/* ── Status Cards ── */}
      <section className="sync-stats-grid" id="sync-stats-section">
        {statusLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sync-stat-card sync-stat-skeleton" />
          ))
        ) : statusError ? (
          <div className="alert alert-error" id="sync-status-error">{statusError}</div>
        ) : status ? (
          <>
            <StatCard
              id="stat-pending"
              label="Pending Syncs"
              value={status.pending ?? '—'}
              icon="⏳"
              colorClass="stat-warning"
            />
            <StatCard
              id="stat-retryable"
              label="Retryable Failures"
              value={status.failedRetryable ?? '—'}
              icon="🔄"
              colorClass="stat-danger"
            />
            <StatCard
              id="stat-exhausted"
              label="Exhausted (Max Retries)"
              value={status.exhausted ?? '—'}
              icon="💀"
              colorClass="stat-muted"
            />
            <StatCard
              id="stat-unanchored"
              label="Unanchored Products"
              value={unanchoredTotal ?? '—'}
              icon="📦"
              colorClass="stat-primary"
            />
          </>
        ) : null}
      </section>

      {/* ── Manual Trigger (admin only) ── */}
      {isAdmin && (
        <section className="card sync-trigger-card" id="sync-trigger-section">
          <div className="sync-trigger-inner">
            <div>
              <h2 className="sync-section-title">⚡ Manual Retry Pass</h2>
              <p className="sync-section-hint">
                Immediately run a sync pass for all pending / failed records — no need to wait for the scheduled job.
              </p>
            </div>
            <button
              className="btn btn-primary"
              id="btn-trigger-sync"
              onClick={handleTrigger}
              disabled={triggering}
            >
              {triggering ? <><span className="spinner" /> Running…</> : '▶ Trigger Now'}
            </button>
          </div>

          {triggerResult && (
            <div
              className={`alert ${triggerResult.ok ? 'alert-success' : 'alert-error'} sync-trigger-result`}
              id="sync-trigger-result"
            >
              {triggerResult.ok ? (
                <>
                  ✅ Sync pass complete.{' '}
                  {triggerResult.data?.result
                    ? `Transfers fixed: ${triggerResult.data.result.transfers?.confirmed ?? 0}, Products anchored: ${triggerResult.data.result.products?.registered ?? 0}.`
                    : ''}
                  {' '}Remaining retryable: {triggerResult.data?.remainingAfter?.failedRetryable ?? '—'}
                </>
              ) : `❌ ${triggerResult.msg}`}
            </div>
          )}
        </section>
      )}

      {/* ── Failed Transfers Table (admin only) ── */}
      {isAdmin && (
        <section className="card sync-table-card" id="sync-failed-transfers">
          <div className="sync-table-header">
            <h2 className="sync-section-title">❌ Failed Transfers</h2>
            <span className="audit-count-badge">{failedTotal}</span>
          </div>

          {failedLoading ? (
            <div className="sync-table-loading"><span className="spinner" /></div>
          ) : failedTx.length === 0 ? (
            <div className="sync-empty">
              <span>🎉</span>
              <p>No failed transfers — all syncs are healthy!</p>
            </div>
          ) : (
            <>
              <div className="sync-table-wrapper">
                <table className="sync-table" id="failed-transfers-table">
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>From → To</th>
                      <th>Status</th>
                      <th>Retries</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedTx.map(tx => (
                      <tr key={tx._id}>
                        <td><code className="hash-code">{shortHash(tx.product?._id || tx.product)}</code></td>
                        <td>
                          <span className="tx-email">{tx.fromUser?.email || '—'}</span>
                          <span className="tx-arrow">→</span>
                          <span className="tx-email">{tx.toUser?.email || '—'}</span>
                        </td>
                        <td>
                          <span className={`sync-status-badge sync-status-${tx.syncStatus}`}>
                            {tx.syncStatus}
                          </span>
                        </td>
                        <td>
                          <span className="retry-count">{tx.retryCount ?? 0}</span>
                          {tx.retriesRemaining != null && (
                            <span className="retries-left">({tx.retriesRemaining} left)</span>
                          )}
                        </td>
                        <td className="tx-date">{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={failedPage}
                total={totalPages(failedTotal)}
                onPrev={() => setFailedPage(p => Math.max(1, p - 1))}
                onNext={() => setFailedPage(p => Math.min(totalPages(failedTotal), p + 1))}
                prefix="failed"
              />
            </>
          )}
        </section>
      )}

      {/* ── Unanchored Products Table (admin only) ── */}
      {isAdmin && (
        <section className="card sync-table-card" id="sync-unanchored-products">
          <div className="sync-table-header">
            <h2 className="sync-section-title">📦 Unanchored Products</h2>
            <span className="audit-count-badge">{unanchoredTotal}</span>
          </div>

          {unanchoredLoading ? (
            <div className="sync-table-loading"><span className="spinner" /></div>
          ) : unanchored.length === 0 ? (
            <div className="sync-empty">
              <span>✅</span>
              <p>All products are anchored on the blockchain!</p>
            </div>
          ) : (
            <>
              <div className="sync-table-wrapper">
                <table className="sync-table" id="unanchored-products-table">
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Name / SKU</th>
                      <th>Owner</th>
                      <th>Retry Count</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unanchored.map(p => (
                      <tr key={p._id}>
                        <td><code className="hash-code">{shortHash(p._id)}</code></td>
                        <td>
                          <span className="prod-name">{p.name}</span>
                          <code className="prod-sku">{p.sku}</code>
                        </td>
                        <td className="tx-email">{p.owner?.email || '—'}</td>
                        <td><span className="retry-count">{p.retryCount ?? 0}</span></td>
                        <td className="tx-date">{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={unanchoredPage}
                total={totalPages(unanchoredTotal)}
                onPrev={() => setUnanchoredPage(p => Math.max(1, p - 1))}
                onNext={() => setUnanchoredPage(p => Math.min(totalPages(unanchoredTotal), p + 1))}
                prefix="unanchored"
              />
            </>
          )}
        </section>
      )}
      {/* ── Dispute Reports Panel (admin only) ── */}
      {isAdmin && (
        <section className="card sync-table-card" id="sync-dispute-reports">
          <div className="sync-table-header">
            <h2 className="sync-section-title">🚨 Stolen / Dispute Reports</h2>
            <span className="audit-count-badge">{disputeTotal}</span>
          </div>
          <p className="sync-section-hint" style={{ marginBottom: 16 }}>
            These are reports filed by receivers (distributors / retailers) for products suspected to be
            <strong> stolen</strong> or <strong>counterfeit</strong>. Review each report and either
            flag the product as <strong>DISPUTED on-chain</strong> (blocks all further transfers)
            or dismiss the report if unfounded.
          </p>

          {disputeResult && (
            <div className={`alert ${disputeResult.ok ? 'alert-success' : 'alert-error'}`}
              style={{ marginBottom: 16 }} id="dispute-action-result">
              {disputeResult.ok ? `✅ ${disputeResult.msg}` : `❌ ${disputeResult.msg}`}
              {disputeResult.txHash && (
                <span style={{ display:'block', fontFamily:'monospace', fontSize:'0.78rem', marginTop:4, opacity:0.8 }}>
                  On-chain TX: {disputeResult.txHash.slice(0, 18)}…{disputeResult.txHash.slice(-8)}
                </span>
              )}
            </div>
          )}

          {disputeLoading ? (
            <div className="sync-table-loading"><span className="spinner" /></div>
          ) : disputes.length === 0 ? (
            <div className="sync-empty">
              <span>✅</span>
              <p>No pending dispute reports — all clear!</p>
            </div>
          ) : (
            <div className="dispute-reports-list">
              {disputes.map(report => (
                <div key={report._id} className="dispute-report-card" id={`dispute-${report._id}`}>
                  <div className="dispute-report-top">
                    <div className="dispute-report-meta">
                      <span className="dispute-product-name">
                        {report.product?.name || '—'}
                        <code className="prod-sku" style={{ marginLeft: 8 }}>{report.product?.sku}</code>
                      </span>
                      <span className="dispute-reporter">
                        🧑 Reported by: <strong>{report.reportedBy?.email || '—'}</strong>
                        <span style={{ opacity: 0.6, marginLeft: 4 }}>({report.reportedBy?.role})</span>
                      </span>
                      <span className="dispute-date">🕒 {formatDate(report.createdAt)}</span>
                    </div>
                    <div className="dispute-report-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        id={`btn-flag-${report._id}`}
                        onClick={() => handleFlagDispute(report._id)}
                        disabled={disputeAction === report._id}
                      >
                        {disputeAction === report._id
                          ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Processing…</>
                          : '🔴 Flag as Stolen / Counterfeit — DISPUTE On-Chain'
                        }
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        id={`btn-reject-${report._id}`}
                        onClick={() => handleRejectDispute(report._id)}
                        disabled={disputeAction === report._id}
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  </div>
                  <div className="dispute-reason-box">
                    <span className="dispute-reason-label">Reporter's reason:</span>
                    <p className="dispute-reason-text">{report.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ id, label, value, icon, colorClass }) {
  return (
    <div className={`sync-stat-card ${colorClass}`} id={id}>
      <span className="sync-stat-icon">{icon}</span>
      <p className="sync-stat-value">{value}</p>
      <p className="sync-stat-label">{label}</p>
    </div>
  );
}

function Pagination({ page, total, onPrev, onNext, prefix }) {
  return (
    <div className="sync-pagination">
      <button
        className="btn btn-ghost btn-sm"
        id={`btn-${prefix}-prev`}
        onClick={onPrev}
        disabled={page <= 1}
      >
        ← Prev
      </button>
      <span className="sync-page-indicator">Page {page} of {total}</span>
      <button
        className="btn btn-ghost btn-sm"
        id={`btn-${prefix}-next`}
        onClick={onNext}
        disabled={page >= total}
      >
        Next →
      </button>
    </div>
  );
}
