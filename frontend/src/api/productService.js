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
