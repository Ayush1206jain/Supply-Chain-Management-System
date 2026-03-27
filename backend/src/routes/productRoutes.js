const express = require("express");

const productController = require("../controllers/productController");
const { authRequired } = require("../middleware/auth");
const { requireRoles } = require("../middleware/requireRole");

const router = express.Router();

router.get("/", authRequired, productController.listProducts);
router.get("/:id", authRequired, productController.getProductById);
router.post(
  "/",
  authRequired,
  requireRoles(["manufacturer", "admin"]),
  productController.createProduct
);

module.exports = router;

