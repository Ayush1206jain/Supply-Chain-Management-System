const express = require("express");
const disputeController = require("../controllers/disputeController");
const { authRequired } = require("../middleware/auth");
const { requireRoles } = require("../middleware/requireRole");

const router = express.Router();

/**
 * POST /api/disputes/report
 * Any authenticated user can file a stolen/counterfeit report.
 * The route guard is intentionally permissive here — business logic
 * restricting who can report is handled in the UI layer.
 */
router.post("/report", authRequired, disputeController.reportDispute);

/**
 * GET /api/disputes/my
 * Returns all dispute reports the current user has filed.
 * Must be declared BEFORE /:id routes to avoid param-matching.
 */
router.get("/my", authRequired, disputeController.myDisputes);

/**
 * GET /api/disputes
 * Admin only — full paginated list of all reports.
 */
router.get(
  "/",
  authRequired,
  requireRoles("admin"),
  disputeController.listDisputes
);

/**
 * POST /api/disputes/:id/flag
 * Admin only — call flagDispute() on-chain, mark report as flagged.
 */
router.post(
  "/:id/flag",
  authRequired,
  requireRoles("admin"),
  disputeController.flagDispute
);

/**
 * POST /api/disputes/:id/reject
 * Admin only — dismiss report, no on-chain action.
 */
router.post(
  "/:id/reject",
  authRequired,
  requireRoles("admin"),
  disputeController.rejectDispute
);

module.exports = router;
