/**
 * auditController.js — Day 10
 *
 * Provides a unified audit view of a product by combining:
 *   1. DB product record (fields, current owner, content hash)
 *   2. Full transfer history from MongoDB
 *   3. On-chain state (contentHash, owner address, registeredAt)
 *   4. Hash consistency check: DB contentHash vs on-chain contentHash
 *
 * Endpoints
 * ──────────
 *   GET /api/audit/:productId
 *     → Full audit report for one product (auth required, any role)
 *
 *   GET /api/audit/:productId/verify
 *     → Lightweight check: returns { verified: true | false, ... } only
 *       (useful as a quick integrity ping without PII)
 */

const { Product, Transfer } = require("../models");
const { getProductFromChain } = require("../utils/chainAdapter");
const { generateProductHash } = require("../utils/hash");

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Normalise a 0x-prefixed bytes32 value from the contract to the same 64-char
 * lowercase hex string stored in the DB (contentHash column).
 * The contract stores contentHash as bytes32; the DB stores a SHA-256 hex string.
 * They match when: bytes32.slice(2).toLowerCase() === dbHex.toLowerCase()
 */
function normaliseChainHash(bytes32Hex) {
  if (!bytes32Hex) return null;
  // Remove 0x prefix and any leading zero-padding beyond 64 chars
  return bytes32Hex.replace(/^0x/, "").padStart(64, "0").toLowerCase();
}

/**
 * Build the audit report object.  Central function used by both endpoints.
 */
async function buildAuditReport(productId) {
  // ── 1. Fetch product from DB ──────────────────────────────────────────────
  const product = await Product.findById(productId)
    .populate("owner", "email role")
    .populate("createdBy", "email role");

  if (!product) {
    return null; // caller handles 404
  }

  // ── 2. Fetch full transfer history ────────────────────────────────────────
  const transfers = await Transfer.find({ product: productId })
    .populate("fromUser", "email role")
    .populate("toUser", "email role")
    .sort({ createdAt: 1 }); // chronological

  // ── 3. Fetch on-chain state (read-only view — no gas) ────────────────────
  const chainData = await getProductFromChain(product);

  // ── 4. Hash consistency check ────────────────────────────────────────────
  let hashConsistency;
  if (!chainData) {
    hashConsistency = {
      status: "not_anchored", // product not yet registered on-chain
      message: "Product has no on-chain record. Register it first.",
    };
  } else {
    const dbHex = (product.contentHash || "").toLowerCase();
    const chainHex = normaliseChainHash(chainData.contentHashOnChain);
    const match = dbHex === chainHex;

    hashConsistency = {
      status: match ? "ok" : "mismatch",
      message: match
        ? "DB contentHash matches on-chain record ✓"
        : "WARNING: DB contentHash does NOT match on-chain record — possible tampering",
      dbHash: dbHex,
      chainHash: chainHex,
    };
  }

  // ── 5. Re-compute hash from live DB fields (tamper check vs DB itself) ────
  const recomputedHash = generateProductHash({
    sku: product.sku,
    name: product.name,
    description: product.description,
    price: product.price,
  });
  const dbFieldIntegrity = {
    status: recomputedHash === product.contentHash ? "ok" : "mismatch",
    message:
      recomputedHash === product.contentHash
        ? "DB fields produce the stored contentHash ✓"
        : "WARNING: Re-computed hash differs — DB fields may have been altered after creation",
    storedHash: product.contentHash,
    recomputedHash,
  };

  return {
    product: {
      id: product._id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price,
      currentOwner: product.owner,
      createdBy: product.createdBy,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      contentHash: product.contentHash,
      blockchainTxHash: product.blockchainTxHash,
    },
    transferHistory: transfers.map((t) => ({
      id: t._id,
      from: t.fromUser,
      to: t.toUser,
      blockchainTxHash: t.blockchainTxHash,
      syncStatus: t.syncStatus,
      timestamp: t.createdAt,
    })),
    chainState: chainData
      ? {
          available: true,
          contentHashOnChain: chainData.contentHashOnChain,
          ownerAddress: chainData.ownerAddress,
          registeredAt: new Date(chainData.registeredAt * 1000).toISOString(),
          registeredAtUnix: chainData.registeredAt,
        }
      : {
          available: false,
          reason: "Chain not configured or product not registered on-chain",
        },
    integrity: {
      hashConsistency,   // DB vs chain
      dbFieldIntegrity,  // recomputed vs stored in DB
      overallVerified:
        hashConsistency.status === "ok" && dbFieldIntegrity.status === "ok",
    },
  };
}

// ─── controllers ────────────────────────────────────────────────────────────

/**
 * GET /api/audit/:productId
 * Full audit report — DB product, transfer history, chain state, integrity checks.
 */
async function getAuditReport(req, res) {
  try {
    const report = await buildAuditReport(req.params.productId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      auditReport: report,
    });
  } catch (err) {
    console.error("[audit] getAuditReport error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Audit report generation failed",
      error: err.message,
    });
  }
}

/**
 * GET /api/audit/:productId/verify
 * Lightweight integrity check — same logic but condensed response.
 */
async function verifyProduct(req, res) {
  try {
    const report = await buildAuditReport(req.params.productId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const { overallVerified, hashConsistency, dbFieldIntegrity } =
      report.integrity;

    return res.status(200).json({
      success: true,
      productId: req.params.productId,
      verified: overallVerified,
      hashConsistency: hashConsistency.status,
      dbFieldIntegrity: dbFieldIntegrity.status,
      chainAvailable: report.chainState.available,
      summary: overallVerified
        ? "Product integrity verified — DB and chain data are consistent"
        : "Product integrity check FAILED — see full audit report for details",
    });
  } catch (err) {
    console.error("[audit] verifyProduct error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Integrity verification failed",
      error: err.message,
    });
  }
}

module.exports = { getAuditReport, verifyProduct };
