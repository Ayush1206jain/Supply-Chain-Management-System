const express = require("express");

const transferController = require("../controllers/transferController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// ─── Existing routes (unchanged) ─────────────────────────────────────────────
router.post("/", authRequired, transferController.createTransfer);
router.get("/", authRequired, transferController.listTransfers);
router.get(
  "/product/:productId",
  authRequired,
  transferController.listTransfersByProduct,
);

// NOTE: /confirm must be declared BEFORE /:id-style routes to avoid being
// swallowed by a param matcher.
// POST /api/transfers/confirm  — receiver confirms a pending transfer
router.post("/confirm", authRequired, transferController.confirmTransfer);

module.exports = router;
