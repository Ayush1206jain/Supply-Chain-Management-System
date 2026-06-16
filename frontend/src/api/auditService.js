import api from './axios';

/**
 * Fetch the full audit report for a product.
 * Returns { product, transferHistory, chainState, integrity }
 */
export async function getAuditReport(productId) {
  const res = await api.get(`/api/audit/${productId}`);
  return res.data.auditReport ?? res.data;
}

/**
 * Fetch the lightweight integrity verdict for a product.
 * Returns { verified, hashConsistency, dbFieldIntegrity, chainAvailable, summary }
 */
export async function verifyProduct(productId) {
  const res = await api.get(`/api/audit/${productId}/verify`);
  return res.data;
}
