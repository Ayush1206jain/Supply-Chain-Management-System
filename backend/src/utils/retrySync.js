/**
 * retrySync.js 
 *
 * Retry engine: finds DB records that failed (or never succeeded) to sync to
 * the blockchain and re-attempts the chain call.
 *
 * Two independent retry passes:
 *   1. retryFailedTransfers()
 *      → Transfers with syncStatus = 'failed' and retryCount < MAX_RETRIES
 *      → Calls transferOwnershipOnChain() again and updates syncStatus
 *
 *   2. retryUnanchoredProducts()
 *      → Products with no blockchainTxHash and retryCount < MAX_RETRIES
 *      → Calls registerProductOnChain() again and updates blockchainTxHash
 *
 *   3. runRetrySync() — runs both passes in sequence; used by the background
 *      job and the manual trigger endpoint.
 *
 * Configuration (via env vars):
 *   CHAIN_SYNC_MAX_RETRIES   – max attempts per record (default: 5)
 *   CHAIN_SYNC_BATCH_SIZE    – records per pass (default: 20)
 */

const { Product, Transfer } = require("../models");
const {
  registerProductOnChain,
  transferOwnershipOnChain,
} = require("./chainAdapter");

// ─── config ──────────────────────────────────────────────────────────────────

const MAX_RETRIES = Number(process.env.CHAIN_SYNC_MAX_RETRIES ?? 5);
const BATCH_SIZE = Number(process.env.CHAIN_SYNC_BATCH_SIZE ?? 20);

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeResult(passed, failed, skipped) {
  return { processed: passed + failed, passed, failed, skipped };
}

// ─── pass 1 : transfers ───────────────────────────────────────────────────────

/**
 * Retry transfers that have syncStatus = 'failed' (or still 'pending' after
 * a long time — included so records stuck at 'pending' are also cleaned up).
 *
 * @returns {{ processed, passed, failed, skipped }}
 */
async function retryFailedTransfers() {
  // Find transfers that still need a chain call and haven't hit the retry cap.
  const candidates = await Transfer.find({
    syncStatus: { $in: ["failed", "pending"] },
    retryCount: { $lt: MAX_RETRIES },
    blockchainTxHash: null, // already confirmed have a hash → skip
  })
    .populate("product") // need product._id + contentHash for chain call
    .limit(BATCH_SIZE)
    .sort({ createdAt: 1 }); // oldest first

  let passed = 0;
  let failed = 0;

  for (const transfer of candidates) {
    const product = transfer.product;

    if (!product) {
      // Orphaned transfer — mark permanently failed
      transfer.syncStatus = "failed";
      transfer.retryCount += 1;
      await transfer.save();
      failed++;
      continue;
    }

    console.log(
      `[retrySync] Retrying transfer ${transfer._id} ` +
        `(attempt ${transfer.retryCount + 1}/${MAX_RETRIES})…`
    );

    const txHash = await transferOwnershipOnChain(product, transfer.toUser);
    transfer.retryCount += 1;

    if (txHash) {
      transfer.blockchainTxHash = txHash;
      transfer.syncStatus = "confirmed";
      passed++;
      console.log(
        `[retrySync] Transfer ${transfer._id} confirmed. txHash: ${txHash}`
      );
    } else {
      transfer.syncStatus =
        transfer.retryCount >= MAX_RETRIES ? "failed" : "failed";
      failed++;
      console.warn(
        `[retrySync] Transfer ${transfer._id} still failing ` +
          `(retryCount: ${transfer.retryCount})`
      );
    }

    await transfer.save();
  }

  return makeResult(passed, failed, 0);
}

// ─── pass 2 : products ────────────────────────────────────────────────────────

/**
 * Retry products that were never registered on-chain (no blockchainTxHash)
 * and haven't hit the retry cap.
 *
 * @returns {{ processed, passed, failed, skipped }}
 */
async function retryUnanchoredProducts() {
  const candidates = await Product.find({
    blockchainTxHash: null,
    retryCount: { $lt: MAX_RETRIES },
  })
    .limit(BATCH_SIZE)
    .sort({ createdAt: 1 });

  let passed = 0;
  let failed = 0;

  for (const product of candidates) {
    console.log(
      `[retrySync] Retrying product registration ${product._id} ` +
        `(attempt ${product.retryCount + 1}/${MAX_RETRIES})…`
    );

    const txHash = await registerProductOnChain(product);
    product.retryCount += 1;

    if (txHash) {
      product.blockchainTxHash = txHash;
      passed++;
      console.log(
        `[retrySync] Product ${product._id} anchored. txHash: ${txHash}`
      );
    } else {
      failed++;
      console.warn(
        `[retrySync] Product ${product._id} still failing ` +
          `(retryCount: ${product.retryCount})`
      );
    }

    await product.save();
  }

  return makeResult(passed, failed, 0);
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Run both retry passes (transfers + products) in sequence.
 * Safe to call from a background job or an HTTP endpoint.
 *
 * @returns {{ transfers: result, products: result, ranAt: string }}
 */
async function runRetrySync() {
  const ranAt = new Date().toISOString();
  console.log(`[retrySync] Starting sync pass at ${ranAt} …`);

  const [transfers, products] = await Promise.all([
    retryFailedTransfers(),
    retryUnanchoredProducts(),
  ]);

  console.log(
    `[retrySync] Done — transfers: ${JSON.stringify(transfers)}, ` +
      `products: ${JSON.stringify(products)}`
  );

  return { transfers, products, ranAt };
}

/**
 * Count records that still need syncing (used by the status endpoint).
 *
 * @returns {{ pendingTransfers, failedTransfers, exhaustedTransfers, unanchoredProducts, exhaustedProducts }}
 */
async function getSyncStats() {
  const [
    pendingTransfers,
    failedTransfers,
    exhaustedTransfers,
    unanchoredProducts,
    exhaustedProducts,
  ] = await Promise.all([
    Transfer.countDocuments({ syncStatus: "pending", blockchainTxHash: null }),
    Transfer.countDocuments({
      syncStatus: "failed",
      retryCount: { $lt: MAX_RETRIES },
    }),
    Transfer.countDocuments({
      syncStatus: "failed",
      retryCount: { $gte: MAX_RETRIES },
    }),
    Product.countDocuments({
      blockchainTxHash: null,
      retryCount: { $lt: MAX_RETRIES },
    }),
    Product.countDocuments({
      blockchainTxHash: null,
      retryCount: { $gte: MAX_RETRIES },
    }),
  ]);

  const retryableCount = pendingTransfers + failedTransfers + unanchoredProducts;

  return {
    transfers: {
      pending: pendingTransfers,
      failedRetryable: failedTransfers,
      exhausted: exhaustedTransfers,
    },
    products: {
      unanchoredRetryable: unanchoredProducts,
      exhausted: exhaustedProducts,
    },
    totalRetryable: retryableCount,
    maxRetriesPerRecord: MAX_RETRIES,
  };
}

module.exports = { runRetrySync, getSyncStats, MAX_RETRIES, BATCH_SIZE };
