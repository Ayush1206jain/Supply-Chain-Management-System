const express = require("express");
const syncController = require("../controllers/syncController");
const { authRequired } = require("../middleware/auth");
const { requireRoles } = require("../middleware/requireRole");

const router = express.Router();

/**
 * GET /api/sync/status
 * Sync dashboard — counts of failed/pending/exhausted records.
 * Any authenticated user (visibility is fine; no mutation).
 */
router.get("/status", authRequired, syncController.getSyncStatus);

/**
 * POST /api/sync/trigger
 * Manually run one retry pass immediately.
 * Admin only — triggers real on-chain transactions.
 */
router.post("/trigger", authRequired, requireRoles("admin"), syncController.triggerSync);

/**
 * GET /api/sync/failed-transfers
 * Paginated list of transfers still awaiting successful chain sync.
 * Admin only — contains user emails and product data.
 */
router.get(
  "/failed-transfers",
  authRequired,
  requireRoles("admin"),
  syncController.listFailedTransfers
);

/**
 * GET /api/sync/unanchored-products
 * Paginated list of products not yet registered on-chain.
 * Admin only.
 */
router.get(
  "/unanchored-products",
  authRequired,
  requireRoles("admin"),
  syncController.listUnanchoredProducts
);

module.exports = router;
