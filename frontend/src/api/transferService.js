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
