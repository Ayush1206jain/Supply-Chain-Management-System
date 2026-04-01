/**
 * syncController.js 
 *
 * HTTP interface for the blockchain sync / retry engine.
 *
 * Endpoints
 * ─────────
 *   GET  /api/sync/status
 *     Returns counts of records in each sync state (no side-effects).
 *
 *   POST /api/sync/trigger
 *     Manually fires one retry pass immediately (admin only).
 *     Returns what was processed + how many are still outstanding.
 *
 *   GET  /api/sync/failed-transfers
 *     Lists transfer records with syncStatus = 'failed' (paginated).
 *
 *   GET  /api/sync/unanchored-products
 *     Lists products with no blockchainTxHash (paginated).
 */

const { Transfer, Product } = require("../models");
const { runRetrySync, getSyncStats, MAX_RETRIES } = require("../utils/retrySync");

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse pagination from query string with safe defaults. */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page  ?? 1,  10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? 20, 10)));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

// ─── controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/sync/status
 * Dashboard snapshot of all sync-related counts. No side-effects.
 */
async function getSyncStatus(req, res) {
  try {
    const stats = await getSyncStats();
    return res.status(200).json({
      success: true,
      syncStatus: stats,
      note:
        stats.totalRetryable > 0
          ? `${stats.totalRetryable} record(s) queued for retry. POST /api/sync/trigger to run now.`
          : "All records are synced or have exhausted retries.",
    });
  } catch (err) {
    console.error("[sync] getSyncStatus error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/sync/trigger
 * Admin-only: Immediately execute one retry pass and return the results.
 */
async function triggerSync(req, res) {
  try {
    const result = await runRetrySync();
    const stats  = await getSyncStats();

    return res.status(200).json({
      success: true,
      message: "Retry sync pass completed.",
      result,
      remainingAfter: stats,
    });
  } catch (err) {
    console.error("[sync] triggerSync error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/sync/failed-transfers
 * Returns failed (or still-pending) transfer records with pagination.
 */
async function listFailedTransfers(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {
      syncStatus: { $in: ["failed", "pending"] },
      blockchainTxHash: null,
    };

    const [total, transfers] = await Promise.all([
      Transfer.countDocuments(filter),
      Transfer.find(filter)
        .populate("product", "sku name contentHash")
        .populate("fromUser", "email role")
        .populate("toUser", "email role")
        .sort({ createdAt: 1 }) // oldest (stuck longest) first
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      maxRetries: MAX_RETRIES,
      transfers: transfers.map((t) => ({
        id:               t._id,
        product:          t.product,
        from:             t.fromUser,
        to:               t.toUser,
        syncStatus:       t.syncStatus,
        retryCount:       t.retryCount,
        retriesRemaining: Math.max(0, MAX_RETRIES - t.retryCount),
        createdAt:        t.createdAt,
      })),
    });
  } catch (err) {
    console.error("[sync] listFailedTransfers error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/sync/unanchored-products
 * Returns products that have no on-chain registration yet.
 */
async function listUnanchoredProducts(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { blockchainTxHash: null };

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate("owner", "email role")
        .populate("createdBy", "email role")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      maxRetries: MAX_RETRIES,
      products: products.map((p) => ({
        id:               p._id,
        sku:              p.sku,
        name:             p.name,
        contentHash:      p.contentHash,
        owner:            p.owner,
        retryCount:       p.retryCount,
        retriesRemaining: Math.max(0, MAX_RETRIES - p.retryCount),
        createdAt:        p.createdAt,
      })),
    });
  } catch (err) {
    console.error("[sync] listUnanchoredProducts error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getSyncStatus,
  triggerSync,
  listFailedTransfers,
  listUnanchoredProducts,
};
