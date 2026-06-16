import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAuditReport } from '../../api/auditService';
import { listProducts, getProductStatus } from '../../api/productService';
import './Audit.css';

/**
 * AuditPage — Day 15
 * Allows any authenticated user to look up a product's full audit trail:
 *  - DB product snapshot
 *  - Chronological ownership transfer history
 *  - Live on-chain state (contentHash, ownerAddress, registeredAt)
 *  - Hash integrity verdict (DB↔chain + DB field re-computation)
 */
export default function AuditPage() {
  const { user } = useAuth();

  // Product list for the dropdown
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Search / input state
  const [productId, setProductId] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Report state
  const [report, setReport] = useState(null);

  // Day 3 (P1): Live chain status from P2 endpoint
  const [chainStatusData, setChainStatusData] = useState(null);

  // Fetch all products on mount for the dropdown
  const fetchAllProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await listProducts();
      setAllProducts(data.products ?? []);
    } catch {
      setAllProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  async function handleSearch(e) {
    e.preventDefault();
    const id = productId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    setReport(null);
    setChainStatusData(null);
    try {
      const [auditData, statusData] = await Promise.allSettled([
        getAuditReport(id),
        getProductStatus(id),
      ]);
      if (auditData.status === 'fulfilled') setReport(auditData.value);
      else throw new Error(auditData.reason?.response?.data?.message || 'Product not found or audit unavailable.');
      if (statusData.status === 'fulfilled') setChainStatusData(statusData.value);
    } catch (err) {
      setError(err.message || 'Product not found or audit unavailable.');
    } finally {
      setLoading(false);
    }
  }

  function renderIntegrityBadge(status) {
    const map = {
      ok:          { label: '✔ Match',        cls: 'verdict-ok' },
      mismatch:    { label: '✘ Mismatch',     cls: 'verdict-fail' },
      not_anchored:{ label: '⏳ Not on-chain', cls: 'verdict-pending' },
      chain_unavailable: { label: '⚡ Chain Offline', cls: 'verdict-pending' },
    };
    const cfg = map[status] || { label: status, cls: 'verdict-pending' };
    return <span className={`verdict-chip ${cfg.cls}`}>{cfg.label}</span>;
  }

  function shortHash(h) {
    if (!h) return '—';
    return h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-10)}` : h;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  function getTransferUiStatus(tx) {
    const receiverConfirmed = Boolean(tx.receiverConfirmed);
    return {
      cls: receiverConfirmed ? 'confirmed' : 'pending',
      label: receiverConfirmed ? 'Receiver confirmed' : 'Awaiting receiver',
      syncLabel: tx.syncStatus
        ? `Chain sync: ${tx.syncStatus}`
        : 'Chain sync: pending',
    };
  }

  const integrity = report?.integrity;
  const overallOk = integrity?.overallVerified;
  // A DISPUTED product always overrides the green banner regardless of hash match
  const isDisputed = chainStatusData?.chainStatus === 'DISPUTED';

  return (
    <div className="audit-page">
      {/* ── Page Header ── */}
      <div className="audit-header">
        <div className="audit-header-icon">🔍</div>
        <div>
          <h1 className="audit-title">Audit Trail</h1>
          <p className="audit-subtitle">
            Verify product integrity against the blockchain — any discrepancy is surfaced instantly.
          </p>
        </div>
      </div>

      {/* ── Search Form ── */}
      <form className="audit-search-card card" onSubmit={handleSearch} id="audit-search-form">
        <label className="form-label" htmlFor="audit-product-select">
          Select a Product to Audit
        </label>

        {!manualMode ? (
          <div className="audit-search-row">
            <select
              id="audit-product-select"
              className="form-input form-select"
              value={productId}
              onChange={e => setProductId(e.target.value)}
              disabled={loadingProducts}
            >
              <option value="">
                {loadingProducts ? 'Loading products…' : '— Choose a product —'}
              </option>
              {allProducts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku}) — Owner: {p.owner?.name || p.owner?.email || 'Unknown'}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn btn-primary"
              id="btn-audit-search"
              disabled={loading || !productId.trim()}
            >
              {loading ? <span className="spinner" /> : '🔍 Inspect'}
            </button>
          </div>
        ) : (
          <div className="audit-search-row">
            <input
              id="audit-product-id"
              className="form-input"
              placeholder="e.g. 6643f2a1c89b4d001e3f5bc0"
              value={productId}
              onChange={e => setProductId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="btn btn-primary"
              id="btn-audit-search"
              disabled={loading || !productId.trim()}
            >
              {loading ? <span className="spinner" /> : '🔍 Inspect'}
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn-link audit-toggle-mode"
          onClick={() => { setManualMode(prev => !prev); setProductId(''); }}
        >
          {manualMode ? '← Back to product list' : 'Or enter Product ID manually'}
        </button>

        {error && (
          <div className="alert alert-error" id="audit-error">
            ⚠ {error}
          </div>
        )}
      </form>

      {/* ── Results ── */}
      {report && (
        <div className="audit-results animate-slide-up">

          {/* ── DISPUTED override banner — shown on top of everything ── */}
          {isDisputed && (
            <div className="verdict-banner verdict-banner-disputed" id="audit-disputed-banner">
              <span className="verdict-banner-icon">🔴</span>
              <div>
                <p className="verdict-banner-title">DISPUTED — Stolen / Counterfeit — Transfer Blocked On-Chain</p>
                <p className="verdict-banner-sub">
                  This product has been flagged as <strong>DISPUTED</strong> by an admin following a
                  stolen or counterfeit report. All further transfers are locked on the blockchain
                  until this dispute is resolved.
                </p>
              </div>
            </div>
          )}

          {/* Overall Verdict Banner — hidden if DISPUTED */}
          {!isDisputed && (
            <div className={`verdict-banner ${overallOk ? 'verdict-banner-ok' : 'verdict-banner-fail'}`} id="audit-verdict-banner">
              <span className="verdict-banner-icon">{overallOk ? '✅' : '❌'}</span>
              <div>
                <p className="verdict-banner-title">
                  {overallOk ? 'Product Verified — Integrity Confirmed' : 'Integrity Check Failed'}
                </p>
                <p className="verdict-banner-sub">
                  {overallOk
                    ? 'DB data, on-chain hash, and field fingerprint all match.'
                    : 'One or more integrity checks did not pass. Review details below.'}
                </p>
              </div>
            </div>
          )}

          <div className="audit-grid">
            {/* ── Left Column ── */}
            <div className="audit-left">

              {/* Product Snapshot */}
              <section className="audit-section card" id="audit-product-snapshot">
                <h2 className="audit-section-title">📦 Product Snapshot</h2>
                <dl className="audit-dl">
                  <dt>Name</dt>       <dd>{report.product?.name || '—'}</dd>
                  <dt>SKU</dt>        <dd><code>{report.product?.sku || '—'}</code></dd>
                  <dt>Description</dt><dd>{report.product?.description || '—'}</dd>
                  <dt>Price</dt>      <dd>₹{report.product?.price?.toLocaleString('en-IN') ?? '—'}</dd>
                  <dt>Current Owner</dt>
                  <dd>
                    <span className="audit-user">{report.product?.owner?.email || '—'}</span>
                    <span className="audit-role-badge">{report.product?.owner?.role}</span>
                  </dd>
                  <dt>Created By</dt>
                  <dd>{report.product?.createdBy?.email || '—'}</dd>
                  <dt>Registered At</dt>
                  <dd>{formatDate(report.product?.createdAt)}</dd>
                  <dt>DB Content Hash</dt>
                  <dd><code className="hash-code">{shortHash(report.product?.contentHash)}</code></dd>
                  <dt>Blockchain Tx</dt>
                  <dd>
                    {report.product?.blockchainTxHash
                      ? <code className="hash-code">{shortHash(report.product.blockchainTxHash)}</code>
                      : <span className="text-dim">Not anchored</span>}
                  </dd>
                </dl>
              </section>

              {/* Integrity Checks */}
              <section className="audit-section card" id="audit-integrity">
                <h2 className="audit-section-title">🔐 Integrity Checks</h2>
                <div className="integrity-rows">
                  <div className="integrity-row">
                    <div>
                      <p className="integrity-label">DB ↔ Blockchain Hash</p>
                      <p className="integrity-hint">Stored contentHash vs. on-chain bytes32 value</p>
                    </div>
                    {renderIntegrityBadge(integrity?.hashConsistency?.status)}
                  </div>
                  <div className="integrity-row">
                    <div>
                      <p className="integrity-label">DB Field Fingerprint</p>
                      <p className="integrity-hint">Live re-computation of SHA-256 from DB fields</p>
                    </div>
                    {renderIntegrityBadge(integrity?.dbFieldIntegrity?.status)}
                  </div>
                  <div className="integrity-row">
                    <div>
                      <p className="integrity-label">Chain Availability</p>
                      <p className="integrity-hint">Whether the blockchain node was reachable</p>
                    </div>
                    <span className={`verdict-chip ${report.chainState?.chainOnline ? 'verdict-ok' : 'verdict-pending'}`}>
                      {report.chainState?.chainOnline ? '✔ Online' : '⚡ Offline'}
                    </span>
                  </div>
                </div>

                {/* On-chain state detail */}
                {report.chainState?.available && (
                  <div className="chain-state-box">
                    <p className="chain-state-title">On-Chain State</p>
                    <dl className="audit-dl audit-dl-compact">
                      <dt>On-Chain Hash</dt>
                      <dd><code className="hash-code">{shortHash(report.chainState.contentHashOnChain)}</code></dd>
                      <dt>Owner Address</dt>
                      <dd><code className="hash-code">{shortHash(report.chainState.ownerAddress)}</code></dd>
                      <dt>Registered At</dt>
                      <dd>{formatDate(report.chainState.registeredAt)}</dd>
                    </dl>
                  </div>
                )}

                {/* Day 3 (P1): Live ProductStatus from P2 /status endpoint */}
                {chainStatusData && (
                  <div className="chain-state-box" id="audit-live-chain-status" style={{ marginTop: 12 }}>
                    <p className="chain-state-title">⛓ Live Product Status (P2)</p>
                    <dl className="audit-dl audit-dl-compact">
                      <dt>Chain Status</dt>
                      <dd>
                        <span className={`chain-status-badge status-${chainStatusData.chainStatus}`} style={{ fontSize: '0.7rem' }}>
                          {chainStatusData.chainStatus || '—'}
                        </span>
                      </dd>
                      {chainStatusData.pendingTransfer && (
                        <>
                          <dt>Pending Transfer From</dt>
                          <dd><code className="hash-code">{shortHash(chainStatusData.pendingTransfer.from)}</code></dd>
                          <dt>Pending Transfer To</dt>
                          <dd><code className="hash-code">{shortHash(chainStatusData.pendingTransfer.to)}</code></dd>
                        </>
                      )}
                    </dl>
                    {chainStatusData.chainStatus === 'DISPUTED' && (
                      <div className="alert alert-error" style={{ marginTop: 8, padding: '6px 10px', fontSize: '0.75rem' }}>
                        ⚠️ <strong>DISPUTED (Stolen / Counterfeit):</strong> This product has been flagged on-chain. Investigate before any further action.
                      </div>
                    )}
                    {chainStatusData.chainStatus === 'IN_TRANSIT' && chainStatusData.pendingTransfer && (
                      <div className="alert" style={{ background: 'rgba(252,196,25,0.1)', border: '1px solid rgba(252,196,25,0.3)', borderRadius: 8, marginTop: 8, padding: '6px 10px', fontSize: '0.75rem', color: '#fbbf24' }}>
                        🚚 <strong>IN TRANSIT:</strong> Ownership handover initiated — awaiting receiver confirmation.
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* ── Right Column — Transfer Timeline ── */}
            <div className="audit-right">
              <section className="audit-section card" id="audit-transfer-history">
                <h2 className="audit-section-title">
                  🔄 Transfer History
                  <span className="audit-count-badge">{report.transferHistory?.length ?? 0}</span>
                </h2>

                {!report.transferHistory?.length ? (
                  <div className="audit-empty">
                    <span className="audit-empty-icon">📋</span>
                    <p>No transfers recorded yet. Product stays with its creator.</p>
                  </div>
                ) : (
                  <ol className="transfer-timeline">
                    {report.transferHistory.map((tx, idx) => {
                      const transferStatus = getTransferUiStatus(tx);
                      return (
                      <li key={tx._id || tx.id || idx} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-content card">
                          <div className="timeline-header">
                            <span className="timeline-step">#{idx + 1}</span>
                            <span className={`status-dot status-${transferStatus.cls}`} title={transferStatus.label} />
                            <span className="timeline-status-label">{transferStatus.label}</span>
                            <span className={`sync-status-inline sync-${tx.syncStatus || 'pending'}`}>
                              {transferStatus.syncLabel}
                            </span>
                          </div>
                          <div className="timeline-flow">
                            <div className="timeline-user">
                              <span className="timeline-user-email" title={tx.fromUser?.email}>
                                {tx.fromUser?.name || tx.fromUser?.email || '—'}
                              </span>
                              <span className="timeline-user-role">{tx.fromUser?.role}</span>
                            </div>
                            <span className="timeline-arrow">→</span>
                            <div className="timeline-user">
                              <span className="timeline-user-email" title={tx.toUser?.email}>
                                {tx.toUser?.name || tx.toUser?.email || '—'}
                              </span>
                              <span className="timeline-user-role">{tx.toUser?.role}</span>
                            </div>
                          </div>
                          <p className="timeline-date">
                            <strong style={{ opacity: 0.7 }}>Transferred on:</strong>{' '}
                            {formatDate(tx.createdAt)}
                          </p>
                          {tx.blockchainTxHash && (
                            <p className="timeline-txhash">
                              <strong style={{ opacity: 0.7 }}>Tx Hash:</strong>{' '}
                              ⛓ <code>{shortHash(tx.blockchainTxHash)}</code>
                            </p>
                          )}
                        </div>
                      </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no search yet */}
      {!report && !loading && !error && (
        <div className="audit-landing">
          <div className="audit-landing-icon">🛡</div>
          <h2 className="audit-landing-title">Blockchain-Backed Integrity Verification</h2>
          <p className="audit-landing-text">
            Enter a Product ID above to inspect its full audit trail — from creation through every
            ownership hand-off, cross-referenced with the immutable on-chain record.
          </p>
          <div className="audit-feature-pills">
            <span className="audit-pill">🔐 Hash Verification</span>
            <span className="audit-pill">📜 Full History</span>
            <span className="audit-pill">⛓ Chain Proof</span>
            <span className="audit-pill">⚡ Real-time</span>
          </div>
        </div>
      )}
    </div>
  );
}
