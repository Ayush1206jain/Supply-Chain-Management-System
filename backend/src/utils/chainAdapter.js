/**
 * chainAdapter.js — Day 9 / Day 10
 *
 * Thin wrappers that translate backend MongoDB concepts into on-chain calls:
 *
 *   registerProductOnChain(product)
 *
 *   getProductFromChain(product)          [Day 10]
 *     → contract.getProduct(productId) returns { contentHash, owner, registeredAt }
 *     → contract.registerProduct(productId, contentHash)
 *
 *   transferOwnershipOnChain(product, toUserId)
 *     → contract.transferOwnership(productId, newOwnerAddress)
 *
 * Both functions return the tx hash string on success, or null if:
 *   - Blockchain is not configured (env vars missing).
 *   - An error occurs (error is logged but NOT re-thrown so the DB
 *     operation is never rolled back just because the chain is down).
 *
 * Design note — address mapping:
 *   MongoDB users don't have Ethereum wallets. The backend wallet acts as
 *   the single trusted oracle. For registerProduct the deployer/backend
 *   wallet becomes the on-chain owner. For transferOwnership we derive a
 *   deterministic Ethereum address from the recipient's MongoDB ObjectId
 *   via keccak256, keeping provenance on-chain without requiring users to
 *   manage keys themselves.
 */

const { ethers } = require("ethers");
const { getChainClient } = require("../config/blockchain");

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * MongoDB ObjectId (12-byte hex string of 24 chars) → 32-byte padded bytes32.
 * Example: "507f1f77bcf86cd799439011" → "0x0000...507f1f77bcf86cd799439011"
 */
function idToBytes32(mongoId) {
  return ethers.zeroPadValue("0x" + mongoId.toString(), 32);
}

/**
 * SHA-256 hex string (64 hex chars = 32 bytes) → 0x-prefixed bytes32.
 * Example: "a3d5..." (64 chars) → "0xa3d5..."
 */
function hashHexToBytes32(hexHash) {
  // Ensure it is exactly 64 hex chars (32 bytes)
  const padded = hexHash.padStart(64, "0");
  return "0x" + padded;
}

/**
 * Derive a deterministic Ethereum address from a MongoDB ObjectId.
 * We keccak256 the id string and take the last 20 bytes as an address.
 * This is used as the "new owner" for on-chain transfer records.
 */
function userIdToAddress(userId) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(userId.toString()));
  // keccak256 → 32 bytes (64 hex). Last 20 bytes = 40 hex chars.
  return ethers.getAddress("0x" + hash.slice(-40));
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Anchors a product's content hash on-chain.
 *
 * @param {object} product - Mongoose Product document (must have _id, contentHash)
 * @returns {Promise<string|null>} tx hash or null
 */
async function registerProductOnChain(product) {
  const client = getChainClient();
  if (!client) {
    console.log("[chain] Blockchain not configured — skipping registerProduct");
    return null;
  }

  try {
    const productIdBytes32 = idToBytes32(product._id);
    const contentHashBytes32 = hashHexToBytes32(product.contentHash);

    const tx = await client.contract.registerProduct(
      productIdBytes32,
      contentHashBytes32
    );
    const receipt = await tx.wait(); // wait for 1 confirmation

    console.log(
      `[chain] Product ${product._id} registered on-chain. txHash: ${receipt.hash}`
    );
    return receipt.hash;
  } catch (err) {
    console.error(
      `[chain] registerProduct failed for product ${product._id}:`,
      err.message
    );
    return null;
  }
}

/**
 * Records an ownership transfer on-chain.
 *
 * @param {object} product  - Mongoose Product document (before owner update)
 * @param {string} toUserId - MongoDB ObjectId of the new owner
 * @returns {Promise<string|null>} tx hash or null
 */
async function transferOwnershipOnChain(product, toUserId) {
  const client = getChainClient();
  if (!client) {
    console.log(
      "[chain] Blockchain not configured — skipping transferOwnership"
    );
    return null;
  }

  try {
    const productIdBytes32 = idToBytes32(product._id);
    const newOwnerAddress = userIdToAddress(toUserId);

    const tx = await client.contract.transferOwnership(
      productIdBytes32,
      newOwnerAddress
    );
    const receipt = await tx.wait();

    console.log(
      `[chain] Ownership of ${product._id} transferred on-chain → ${newOwnerAddress}. txHash: ${receipt.hash}`
    );
    return receipt.hash;
  } catch (err) {
    console.error(
      `[chain] transferOwnership failed for product ${product._id}:`,
      err.message
    );
    return null;
  }
}

/**
 * Reads a product's on-chain record for audit / verification purposes.
 * Uses the view function — no gas, no tx.
 *
 * @param {object} product - Mongoose Product document (must have _id)
 * @returns {Promise<{contentHash: string, owner: string, registeredAt: number}|null>}
 */
async function getProductFromChain(product) {
  const client = getChainClient();
  if (!client) {
    console.log("[chain] Blockchain not configured — skipping getProduct");
    return null;
  }

  try {
    const productIdBytes32 = idToBytes32(product._id);
    const [contentHashBytes32, ownerAddress, registeredAtBigInt] =
      await client.contract.getProduct(productIdBytes32);

    return {
      /** 0x-prefixed 32-byte hex — strip leading zeros to compare with DB 64-char hex */
      contentHashOnChain: contentHashBytes32,
      ownerAddress,
      registeredAt: Number(registeredAtBigInt),
    };
  } catch (err) {
    // Contract reverts with "unknown product" when not registered yet
    if (err.message && err.message.includes("unknown product")) {
      return null; // not on chain yet
    }
    console.error(
      `[chain] getProduct failed for product ${product._id}:`,
      err.message
    );
    return null;
  }
}

module.exports = { registerProductOnChain, transferOwnershipOnChain, getProductFromChain };
