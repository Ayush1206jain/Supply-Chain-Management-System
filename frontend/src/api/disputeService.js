import api from "./axios";

/**
 * Dispute API service — wraps all /api/disputes calls.
 */

/**
 * File a stolen/counterfeit report (any authenticated user).
 * @param {{ productId: string, reason: string }} data
 */
export async function reportDispute(data) {
  const res = await api.post("/api/disputes/report", data);
  return res.data; // { success, message, report }
}

/**
 * Fetch all dispute reports filed by the current user.
 */
export async function getMyDisputes() {
  const res = await api.get("/api/disputes/my");
  return res.data; // { success, count, reports }
}

/**
 * Fetch all dispute reports — admin only.
 * @param {{ status?: string, page?: number, limit?: number }} params
 */
export async function listDisputes(params = {}) {
  const res = await api.get("/api/disputes", { params });
  return res.data; // { success, total, page, reports }
}

/**
 * Admin: flag the dispute on-chain (calls flagDispute() on the smart contract).
 * @param {string} reportId
 * @param {{ adminNote?: string }} data
 */
export async function flagDisputeReport(reportId, data = {}) {
  const res = await api.post(`/api/disputes/${reportId}/flag`, data);
  return res.data; // { success, message, report, blockchainTxHash }
}

/**
 * Admin: reject/dismiss a dispute report (no on-chain action).
 * @param {string} reportId
 * @param {{ adminNote?: string }} data
 */
export async function rejectDisputeReport(reportId, data = {}) {
  const res = await api.post(`/api/disputes/${reportId}/reject`, data);
  return res.data; // { success, message, report }
}
