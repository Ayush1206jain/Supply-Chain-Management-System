import api from "./axios";

/** Initiate an ownership transfer. */
export async function createTransfer(data) {
  const res = await api.post("/api/transfers", data);
  return res.data; // { transfer: {...} }
}

/** Get all transfers for a given product. */
export async function getTransfersByProduct(productId) {
  const res = await api.get(`/api/transfers/product/${productId}`);
  return res.data; // { transfers: [...] }
}

/** Receiver confirms a pending maker-checker transfer. */
export async function confirmTransfer(transferId) {
  const res = await api.post("/api/transfers/confirm", { transferId });
  return res.data;
}

/** Get all pending transfers where the current user is the receiver. */
export async function getPendingTransfersForMe(userId) {
  const toUserId = userId || "me";
  const res = await api.get("/api/transfers", {
    params: { toUserId, receiverConfirmed: false },
  });
  return res.data; // { transfers: [...] }
}
