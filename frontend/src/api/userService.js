import api from "./axios";

/**
 * User API service — helpers for user lookups used in the Transfer form.
 */

/** Fetch currently authenticated user's profile. */
export async function getMe() {
  const res = await api.get("/api/auth/me");
  return res.data; // { user: {...} }
}

/** Fetch users for transfer recipient dropdowns. */
export async function listUsers(params = {}) {
  const res = await api.get("/api/auth/users", { params });
  return res.data; // { users: [...] }
}

/** Delete a user by ID (Admins only). */
export async function deleteUser(id) {
  const res = await api.delete(`/api/auth/users/${id}`);
  return res.data; // { success: true, message: "..." }
}
