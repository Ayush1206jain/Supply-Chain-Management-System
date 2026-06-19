import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Login/LoginPage";
import RegisterPage from "./pages/Login/RegisterPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProductsPage from "./pages/Products/ProductsPage";
import TransfersPage from "./pages/Transfers/TransfersPage";
import AuditPage from "./pages/Audit/AuditPage";
import SyncPage from "./pages/Sync/SyncPage";

/**
 * Root application component.
 * – Public routes: /login, /register
 * – Protected routes: / (dashboard), /products, /transfers, /audit, /sync
 
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

        {/* Products page */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        {/* Transfers page */}
        <Route
          path="/transfers"
          element={
            <ProtectedRoute>
              <TransfersPage />
            </ProtectedRoute>
          }
        />

        {/* Audit Trail page */}
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit/:id"
          element={
            <ProtectedRoute>
              <AuditPage />
            </ProtectedRoute>
          }
        />

        {/*  Sync Status panel */}
        <Route
          path="/sync"
          element={
            <ProtectedRoute>
              <SyncPage />
            </ProtectedRoute>
          }
        />


        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
