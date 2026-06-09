import api from "./axios";

/**
 * Transfer API service — wraps all /api/transfers calls.
 */

/**
 * Initiate an ownership transfer.
 * @param {{ productId: string, toUserId: string }} data
 */
export async function createTransfer(data) {
  const res = await api.post("/api/transfers", data);
  return res.data; // { transfer: {...} }
}

/**
 * Get all transfers for a given product.
 * @param {string} productId
 */
export async function getTransfersByProduct(productId) {
  const res = await api.get(`/api/transfers/product/${productId}`);
  return res.data; // { transfers: [...] }
}

/**
 * Day 3 (P1): Receiver confirms a pending multi-sig transfer.
 * Calls POST /api/transfers/confirm (added in Day 2 P2).
 * @param {string} transferId  MongoDB ObjectId of the pending transfer
 * @returns {{ success: boolean, message: string, transfer: object, blockchainSyncStatus: string }}
 */
export async function confirmTransfer(transferId) {
  const res = await api.post("/api/transfers/confirm", { transferId });
  return res.data;
}

/**
 * Day 3 (P1): Get all pending transfers where the current user is the receiver.
 * Reuses GET /api/transfers/product/:productId but filters client-side.
 * For a dedicated endpoint, the backend would expose GET /api/transfers/pending-for-me.
 * @param {string} productId
 */
export async function getPendingTransfersForMe(userId) {
  // The backend's existing GET /api/transfers/product/:id requires a productId.
  // We call GET /api/transfers with no filter — if the backend supports it — or
  // fetch by userId. For now we pass the userId as a query so callers can build
  // a list from the transfers page.
  const res = await api.get(`/api/transfers?toUserId=${userId}&syncStatus=pending`);
  return res.data; // { transfers: [...] }
}
