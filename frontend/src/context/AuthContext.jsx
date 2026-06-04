import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchCurrentUser } from "../api/authService";

const AuthContext = createContext(null);

/**
 * Global authentication context.
 * – Stores `user` and `token` in state + localStorage.
 * – On mount, if a token exists it validates by calling GET /api/auth/me.
 * – Exposes `login()`, `logout()`, `isAuthenticated`, `hasRole()`.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(!!localStorage.getItem("token")); // verify on mount

  // Verify saved token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          clearAuth();
        }
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAuth() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  /** Called after a successful login API call. */
  const login = useCallback((tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  /** Clears auth state and redirects to /login. */
  const logout = useCallback(() => {
    clearAuth();
  }, []);

  /** Check if the current user has a specific role. */
  const hasRole = useCallback(
    (...roles) => !!user && roles.includes(user.role),
    [user]
  );

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * @returns {{ user, token, loading, isAuthenticated, login, logout, hasRole }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
