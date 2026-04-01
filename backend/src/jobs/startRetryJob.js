/**
 * startRetryJob.js 
 *
 * Starts a background setInterval job that periodically retries failed /
 * pending blockchain sync operations.
 *
 * Configuration (env vars):
 *   CHAIN_SYNC_INTERVAL_MS  – how often to run in ms (default: 60_000 = 1 min)
 *
 * Usage (in index.js, after DB is connected):
 *   const { startRetryJob } = require('./jobs/startRetryJob');
 *   startRetryJob();
 *
 * The job is skipped entirely when the chain is not configured — it checks
 * for the required env vars before scheduling.
 */

const { runRetrySync } = require("../utils/retrySync");

const INTERVAL_MS = Number(process.env.CHAIN_SYNC_INTERVAL_MS ?? 60_000);

let _jobTimer = null;
let _running = false; // prevent overlapping runs

/**
 * Start the background retry job.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
function startRetryJob() {
  if (_jobTimer) {
    console.log("[retryJob] Already running — skipping duplicate start.");
    return;
  }

  // Only schedule when blockchain env vars are present
  const { BLOCKCHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS } =
    process.env;
  if (!BLOCKCHAIN_RPC_URL || !DEPLOYER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.log(
      "[retryJob] Blockchain not configured — retry job will not start. " +
        "Set BLOCKCHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS to enable."
    );
    return;
  }

  console.log(
    `[retryJob] Starting blockchain sync retry job (interval: ${INTERVAL_MS}ms)`
  );

  _jobTimer = setInterval(async () => {
    if (_running) {
      console.log("[retryJob] Previous run still in progress — skipping tick.");
      return;
    }

    _running = true;
    try {
      await runRetrySync();
    } catch (err) {
      console.error("[retryJob] Unexpected error during retry sync:", err.message);
    } finally {
      _running = false;
    }
  }, INTERVAL_MS);

  // Unref so the timer doesn't keep the process alive if everything else exits
  if (_jobTimer.unref) _jobTimer.unref();
}

/**
 * Stop the background job (useful in tests or graceful shutdown).
 */
function stopRetryJob() {
  if (_jobTimer) {
    clearInterval(_jobTimer);
    _jobTimer = null;
    console.log("[retryJob] Retry job stopped.");
  }
}

module.exports = { startRetryJob, stopRetryJob };
