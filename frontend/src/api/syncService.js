import api from './axios';

/**
 * GET /api/sync/status — available to all authenticated users.
 * Returns counts: { pending, failedRetryable, exhausted, confirmedTransfers, unanchoredProducts }
 */
export async function getSyncStatus() {
  const res = await api.get('/api/sync/status');
  return res.data;
}

/**
 * POST /api/sync/trigger — admin only.
 * Manually triggers a one-off retry pass.
 * Returns { result, remainingAfter }
 */
export async function triggerSync() {
  const res = await api.post('/api/sync/trigger');
  return res.data;
}

/**
 * GET /api/sync/failed-transfers — admin only.
 * Returns paginated list of failed transfers.
 */
export async function getFailedTransfers(page = 1, limit = 10) {
  const res = await api.get('/api/sync/failed-transfers', { params: { page, limit } });
  return res.data;
}

/**
 * GET /api/sync/unanchored-products — admin only.
 * Returns paginated list of products not yet on-chain.
 */
export async function getUnanchoredProducts(page = 1, limit = 10) {
  const res = await api.get('/api/sync/unanchored-products', { params: { page, limit } });
  return res.data;
}
