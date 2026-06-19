const express = require("express");

const productController = require("../controllers/productController");
const { authRequired } = require("../middleware/auth");
const { requireRoles } = require("../middleware/requireRole");

const router = express.Router();

// ─── Existing routes ─────────────────────────────────────────────
router.get("/", authRequired, productController.listProducts);
router.post(
  "/",
  authRequired,
  requireRoles(["manufacturer", "admin"]),
  productController.createProduct
);

// GET /api/products/search 
router.get("/search", authRequired, productController.searchProducts);

// NOTE: /... specific routes must come BEFORE /:id to avoid matching conflicts.
// GET /api/products/:id/status  — live DB + blockchain status view
router.get("/:id/status", authRequired, productController.getProductStatus);

// ─── Existing parameterised routes ───────────────────────────────────────────
router.get("/:id", authRequired, productController.getProductById);

module.exports = router;
