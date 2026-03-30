const { Product } = require("../models");
const { generateProductHash } = require("../utils/hash");
const { registerProductOnChain } = require("../utils/chainAdapter");

async function createProduct(req, res) {
  const { sku, name, description, price } = req.body || {};

  if (!sku || !name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: "sku, name, and price are required",
    });
  }

  const existing = await Product.findOne({ sku: String(sku).trim() });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Product already exists for this SKU",
    });
  }

  const contentHash = generateProductHash({ sku, name, description, price });
  const owner = req.user.id;

  const product = await Product.create({
    sku: String(sku).trim(),
    name: String(name).trim(),
    description: description || "",
    price: Number(price),
    owner,
    createdBy: req.user.id,
    contentHash,
  });

  // ── Day 9: anchor content hash on-chain ──────────────────────────────────
  // Fire-and-forget: failure does NOT abort the API response.
  const txHash = await registerProductOnChain(product);
  if (txHash) {
    product.blockchainTxHash = txHash;
    await product.save();
  }
  // ─────────────────────────────────────────────────────────────────────────

  return res.status(201).json({
    success: true,
    product,
  });
}

async function listProducts(req, res) {
  const products = await Product.find()
    .populate("owner", "email role")
    .populate("createdBy", "email role")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
}

async function getProductById(req, res) {
  const { id } = req.params;
  const product = await Product.findById(id)
    .populate("owner", "email role")
    .populate("createdBy", "email role");

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  return res.status(200).json({
    success: true,
    product,
  });
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
};

