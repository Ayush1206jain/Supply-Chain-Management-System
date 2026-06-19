import api from "./axios";

/**
 * Product API service — wraps all /api/products calls.
 */

/** Fetch all products (any authenticated user). */
export async function listProducts() {
  const res = await api.get("/api/products");
  return res.data; // { products: [...] }
}

/** Fetch a single product by id. */
export async function getProduct(id) {
  const res = await api.get(`/api/products/${id}`);
  return res.data; // { product: {...} }
}

/**
 * Create a product (manufacturer or admin only).
 * @param {{ sku: string, name: string, description?: string, price: number }} data
 */
export async function createProduct(data) {
  const res = await api.post("/api/products", data);
  return res.data; // { product: {...} }
}

/**
 * Get combined DB + live blockchain status for a product.
 * Calls GET /api/products/:id/status .
 * Returns { productId, sku, name, dbOwner, chainStatus, pendingTransfer, blockchainTxHash }
 * chainStatus: 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'DISPUTED' | 'NOT_ANCHORED' | 'CHAIN_UNAVAILABLE'
 * @param {string} id  MongoDB ObjectId of the product
 */
export async function getProductStatus(id) {
  const res = await api.get(`/api/products/${id}/status`);
  return res.data;
}

/** Search, filter, and paginate products. */
export async function searchProducts(params = {}) {
  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    )
  ).toString();

  const res = await api.get(
    `/api/products/search${queryString ? "?" + queryString : ""}`
  );
  return res.data; // { products, pagination, filters }
}

