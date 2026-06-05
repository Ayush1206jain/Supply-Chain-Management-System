import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
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
  );
}
