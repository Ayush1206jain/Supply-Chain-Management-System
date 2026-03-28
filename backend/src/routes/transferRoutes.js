const express = require("express");

const transferController = require("../controllers/transferController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.post("/", authRequired, transferController.createTransfer);
router.get(
  "/product/:productId",
  authRequired,
  transferController.listTransfersByProduct
);

module.exports = router;

