import api from "./axios";

/**
 * Auth service — wraps backend /api/auth endpoints.
 */

export async function loginUser(email, password) {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data; // { success, token, user }
}

export async function registerUser(email, password, role) {
  const { data } = await api.post("/api/auth/register", {
    email,
    password,
    role,
  });
  return data; // { success, user }
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/api/auth/me");
  return data; // { success, user }
}
