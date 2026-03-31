const express = require("express");
const auditController = require("../controllers/auditController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/audit/:productId
 * Full audit report: DB fields + transfer history + on-chain state + integrity check.
 * Requires authentication (any role can audit).
 */
router.get("/:productId", authRequired, auditController.getAuditReport);

/**
 * GET /api/audit/:productId/verify
 * Lightweight hash-consistency ping.
 * Returns { verified: true|false } without extra PII fields.
 */
router.get("/:productId/verify", authRequired, auditController.verifyProduct);

module.exports = router;
