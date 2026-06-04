import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

/**
 * Role-aware dashboard — placeholder for Day 14.
 * Shows a welcome message and role-specific quick-action cards.
 */

const ROLE_CONFIG = {
  manufacturer: {
    label: "Manufacturer",
    gradient: "var(--clr-hero-bg-manufacturer)",
    icon: "🏭",
    actions: [
      { label: "Register Product", path: "/products", icon: "📦" },
      { label: "Transfer Ownership", path: "/transfers", icon: "🔄" },
      { label: "Audit Trail", path: "/audit", icon: "🔍" },
    ],
  },
  distributor: {
    label: "Distributor",
    gradient: "var(--clr-hero-bg-distributor)",
    icon: "🚚",
    actions: [
      { label: "My Products", path: "/products", icon: "📦" },
      { label: "Transfer Ownership", path: "/transfers", icon: "🔄" },
      { label: "Audit Trail", path: "/audit", icon: "🔍" },
    ],
  },
  retailer: {
    label: "Retailer",
    gradient: "var(--clr-hero-bg-retailer)",
    icon: "🏪",
    actions: [
      { label: "My Products", path: "/products", icon: "📦" },
      { label: "Verify Product", path: "/audit", icon: "✅" },
    ],
  },
  admin: {
    label: "Admin",
    gradient: "var(--clr-hero-bg-admin)",
    icon: "🛡️",
    actions: [
      { label: "All Products", path: "/products", icon: "📦" },
      { label: "Sync Status", path: "/sync", icon: "🔗" },
      { label: "Audit Trail", path: "/audit", icon: "🔍" },
      { label: "Transfers", path: "/transfers", icon: "🔄" },
    ],
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const config = ROLE_CONFIG[user?.role] || ROLE_CONFIG.retailer;

  return (
    <div className="dashboard animate-fade-in" id="dashboard-page">
      {/* Hero */}
      <section className="dashboard-hero" style={{ background: config.gradient }}>
        <div className="dashboard-hero-inner">
          <span className="dashboard-hero-icon">{config.icon}</span>
          <div>
            <h1 className="dashboard-welcome">
              Welcome back, <span className="dashboard-email">{user?.email}</span>
            </h1>
            <p className="dashboard-role-label">
              Logged in as <strong>{config.label}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="dashboard-section">
        <h2 className="dashboard-section-title">Quick Actions</h2>
        <div className="dashboard-actions stagger">
          {config.actions.map((action) => (
            <a
              key={action.path + action.label}
              href={action.path}
              className="dashboard-action-card card animate-slide-up"
              id={`action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="dashboard-action-icon">{action.icon}</span>
              <span className="dashboard-action-label">{action.label}</span>
              <span className="dashboard-action-arrow">→</span>
            </a>
          ))}
        </div>
      </section>

      {/* Info section */}
      <section className="dashboard-section">
        <h2 className="dashboard-section-title">System Overview</h2>
        <div className="dashboard-info-grid stagger">
          <div className="card card-glass animate-slide-up">
            <p className="dashboard-info-label">Platform</p>
            <p className="dashboard-info-value">ChainTrack v1.0</p>
          </div>
          <div className="card card-glass animate-slide-up">
            <p className="dashboard-info-label">Blockchain</p>
            <p className="dashboard-info-value">Ethereum (Hardhat)</p>
          </div>
          <div className="card card-glass animate-slide-up">
            <p className="dashboard-info-label">Smart Contract</p>
            <p className="dashboard-info-value">SupplyChainRegistry</p>
          </div>
        </div>
      </section>
    </div>
  );
}
