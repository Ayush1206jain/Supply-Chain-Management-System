import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

/**
 * Top navigation bar — shown on all authenticated pages.
 * Shows user email, role badge, and logout button.
 */
export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <nav className="navbar" id="main-navbar">
        <div className="navbar-inner">
          {/* Brand */}
          <NavLink to="/" className="navbar-brand" id="navbar-brand">
            <span className="navbar-logo">⛓</span>
            <span className="navbar-title">BlockTrace</span>
          </NavLink>

          {/* Links */}
          <div className="navbar-links">
            <NavLink to="/" end className="navbar-link" id="nav-dashboard">
              Dashboard
            </NavLink>
            <NavLink to="/products" className="navbar-link" id="nav-products">
              Products
            </NavLink>
            <NavLink to="/transfers" className="navbar-link" id="nav-transfers">
              Transfers
            </NavLink>
            <NavLink to="/audit" className="navbar-link" id="nav-audit">
              Audit
            </NavLink>
            {user?.role === "admin" && (
              <NavLink to="/sync" className="navbar-link" id="nav-sync">
                Sync
              </NavLink>
            )}
          </div>

          {/* User info + theme toggle + logout */}
          <div className="navbar-user">
            <ThemeToggle />
            <NotificationBell />
            <span className="badge badge-primary" id="user-role-badge">
              {user?.role?.toUpperCase()}
            </span>
            <span className="navbar-email">{user?.email}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              id="btn-logout"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom navigation for mobile / split screens */}
      <nav className="bottom-nav" id="mobile-bottom-nav">
        <NavLink to="/" end className="bottom-nav-link" id="mobile-nav-dashboard">
          <span className="bottom-nav-icon">📊</span>
          <span className="bottom-nav-label">Dashboard</span>
        </NavLink>
        <NavLink to="/products" className="bottom-nav-link" id="mobile-nav-products">
          <span className="bottom-nav-icon">📦</span>
          <span className="bottom-nav-label">Products</span>
        </NavLink>
        <NavLink to="/transfers" className="bottom-nav-link" id="mobile-nav-transfers">
          <span className="bottom-nav-icon">🔄</span>
          <span className="bottom-nav-label">Transfers</span>
        </NavLink>
        <NavLink to="/audit" className="bottom-nav-link" id="mobile-nav-audit">
          <span className="bottom-nav-icon">🔍</span>
          <span className="bottom-nav-label">Audit</span>
        </NavLink>
        {user?.role === "admin" && (
          <NavLink to="/sync" className="bottom-nav-link" id="mobile-nav-sync">
            <span className="bottom-nav-icon">⚙️</span>
            <span className="bottom-nav-label">Sync</span>
          </NavLink>
        )}
      </nav>
    </>
  );
}
