const { Product } = require("../models");
const { generateProductHash } = require("../utils/hash");
const {
  registerProductOnChain,
  getProductFromChain,
  getPendingTransferFromChain,
} = require("../utils/chainAdapter");

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
    .populate("owner", "name email role")
    .populate("createdBy", "name email role")
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
    .populate("owner", "name email role")
    .populate("createdBy", "name email role");

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

// ─── Day 2 (P2): Combined DB + chain status ────────────────────────────────────

const STATUS_MAP = ["CREATED", "IN_TRANSIT", "DELIVERED", "DISPUTED"];

/**
 * GET /api/products/:id/status
 * Auth: any authenticated user.
 *
 * Returns a combined view of:
 *   - Core DB fields (productId, sku, name, dbOwner)
 *   - Live on-chain status enum (chainStatus)
 *   - Any pending multi-sig transfer details (pendingTransfer)
 *   - blockchainTxHash from DB
 *
 * If the blockchain is unavailable, chainStatus = 'CHAIN_UNAVAILABLE' and
 * pendingTransfer = null — the response still succeeds (200) so the frontend
 * degrades gracefully.
 */
async function getProductStatus(req, res) {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  let chainStatus = null;
  let pendingTransfer = null;
  let chainLastUpdatedAt = null;

  try {
    // Live chain read — returns null if chain unavailable or not registered
    const chainData = await getProductFromChain(product);
    if (chainData) {
      chainStatus = STATUS_MAP[chainData.status] || "UNKNOWN";
      chainLastUpdatedAt = chainData.lastUpdatedAt
        ? new Date(chainData.lastUpdatedAt * 1000).toISOString()
        : null;
    } else {
      chainStatus = "NOT_ANCHORED";
    }

    // Check for a pending multi-sig transfer
    const pt = await getPendingTransferFromChain(product);
    if (pt && pt.exists) {
      pendingTransfer = {
        from: pt.from,
        to: pt.to,
        initiatedAt: pt.initiatedAt
          ? new Date(pt.initiatedAt * 1000).toISOString()
          : null,
      };
    }
  } catch (e) {
    // Chain read failed — degrade gracefully
    chainStatus = "CHAIN_UNAVAILABLE";
    console.error("[chain] getProductStatus chain read failed:", e.message);
  }

  return res.status(200).json({
    success: true,
    productId: product._id,
    sku: product.sku,
    name: product.name,
    dbOwner: product.owner,
    chainStatus,
    chainLastUpdatedAt,
    pendingTransfer,
    blockchainTxHash: product.blockchainTxHash || null,
  });
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  getProductStatus,
};

