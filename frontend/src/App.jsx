import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Login/LoginPage";
import RegisterPage from "./pages/Login/RegisterPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProductsPage from "./pages/Products/ProductsPage";
import TransfersPage from "./pages/Transfers/TransfersPage";

/**
 * Root application component.
 * – Public routes: /login, /register
 * – Protected routes: / (dashboard), /products, /transfers, /audit, /sync
 * – Day 14: Products and Transfers pages are now fully implemented.
 * – Day 15 will add Audit and Sync pages.
 */
export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
          }
        />

        {/* Protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Day 14 — Products page */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        {/* Day 14 — Transfers page */}
        <Route
          path="/transfers"
          element={
            <ProtectedRoute>
              <TransfersPage />
            </ProtectedRoute>
          }
        />

        {/* Placeholder routes — wired up in Day 15 */}
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Audit Trail" emoji="🔍" day={15} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sync"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Sync Status" emoji="🔗" day={15} />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/**
 * Temporary placeholder for pages built in Day 15+.
 */
function PlaceholderPage({ title, emoji, day }) {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "60px auto",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "3rem" }}>{emoji}</span>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 12 }}>
        {title}
      </h1>
      <p style={{ color: "var(--clr-text-dim)", marginTop: 8 }}>
        This page will be implemented on Day {day}.
      </p>
    </div>
  );
}
