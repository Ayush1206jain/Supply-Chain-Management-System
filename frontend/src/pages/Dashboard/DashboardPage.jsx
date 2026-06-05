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
          {/* Animated Waving Mascot in place of the icon */}
          <div className="dashboard-hero-graphic animate-fade-in">
            <svg className="hello-avatar-svg" viewBox="0 0 120 120" width="110" height="110">
              <circle cx="60" cy="60" r="50" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
              <path d="M30 100 C30 84 42 76 60 76 C78 76 90 84 90 100 Z" fill="#3b82f6" />
              <rect x="54" y="60" width="12" height="18" fill="#fbcfe8" rx="2" />
              <circle cx="60" cy="50" r="20" fill="#fde047" />
              <circle cx="53" cy="46" r="2" fill="#1e293b" />
              <circle cx="67" cy="46" r="2" fill="#1e293b" />
              <path d="M54 54 Q60 59 66 54" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="50" cy="51" r="2" fill="#f43f5e" opacity="0.6" />
              <circle cx="70" cy="51" r="2" fill="#f43f5e" opacity="0.6" />
              <path d="M40 50 C40 30 80 30 80 50 C80 38 40 38 40 50 Z" fill="#1e293b" />
              <g className="waving-arm-group">
                <path d="M85 85 C95 70 95 60 102 55" stroke="#fbcfe8" strokeWidth="6" strokeLinecap="round" fill="none" />
                <circle cx="102" cy="55" r="5" fill="#fde047" />
                <path d="M109 50 C111 53 111 57 109 60" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" className="wave-line-a" />
                <path d="M113 47 C116 51 116 59 113 63" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" className="wave-line-b" />
              </g>
              <g className="hello-speech-bubble">
                <rect x="10" y="8" width="40" height="22" rx="6" fill="#ffffff" />
                <path d="M30 30 L34 30 L32 34 Z" fill="#ffffff" />
                <text x="30" y="23" textAnchor="middle" fontSize="11" fontWeight="800" fill="#4f46e5" fontFamily="'Plus Jakarta Sans', sans-serif">Hi!</text>
              </g>
            </svg>
          </div>

          <div className="dashboard-hero-text-block">
            <h1 className="dashboard-welcome">
              Welcome back, {config.label} !
            </h1>
            <h2 className="dashboard-hero-tagline">
              Track Every Product. Verify Every Step.
            </h2>
            <p className="dashboard-hero-description">
              Blockchain-powered transparency across the entire supply chain.
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
            <p className="dashboard-info-value">BlockTrace v1.0</p>
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

      {/* Floating 3D SCM Illustrations for Manufacturer Role */}
      {user?.role === "manufacturer" && (
        <div className="manufacturing-decorations" aria-hidden="true">
          <img src="/assets/icons/box_3d.png" alt="Box" className="decor-icon decor-box" />
          <img src="/assets/icons/pointer_3d.png" alt="Pointer" className="decor-icon decor-pointer" />
          <img src="/assets/icons/truck_3d.png" alt="Truck" className="decor-icon decor-truck" />
          <img src="/assets/icons/checklist_3d.png" alt="Checklist" className="decor-icon decor-checklist" />
        </div>
      )}
    </div>
  );
}
