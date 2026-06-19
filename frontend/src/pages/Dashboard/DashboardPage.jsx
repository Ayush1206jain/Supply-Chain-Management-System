import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useScrollVisibility } from "../../hooks/useScrollVisibility";
import { listUsers, deleteUser } from "../../api/userService";
import "./Dashboard.css";

/**
 * 
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
    ],
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const config = ROLE_CONFIG[user?.role] || ROLE_CONFIG.retailer;
  const isFooterVisible = useScrollVisibility();

  // Admin user management state
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [activeRole, setActiveRole] = useState("manufacturer");

  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  async function fetchUsers() {
    try {
      setLoadingUsers(true);
      setUserError("");
      const data = await listUsers();
      // Filter out current admin from the list so they don't delete themselves
      const currentUserId = user?.id || user?._id;
      setUsersList((data.users ?? []).filter(u => u._id !== currentUserId));
    } catch (err) {
      setUserError("Failed to fetch registered users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleRemoveUser(userId, userName) {
    if (!window.confirm(`Are you sure you want to remove user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(userId);
      setUserError("");
      setUserSuccess("");
      await deleteUser(userId);
      setUserSuccess(`User "${userName}" has been successfully removed.`);
      // Refresh the list
      await fetchUsers();
      setTimeout(() => setUserSuccess(""), 5000);
    } catch (err) {
      setUserError(err.response?.data?.message || `Failed to remove user "${userName}".`);
    } finally {
      setDeletingId(null);
    }
  }

  const manufacturers = usersList.filter((u) => u.role === "manufacturer");
  const distributors = usersList.filter((u) => u.role === "distributor");
  const retailers = usersList.filter((u) => u.role === "retailer");

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
              Welcome back, {user?.name || config.label} !
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

      {/* Admin User Management Section */}
      {user?.role === "admin" && (
        <section className="dashboard-section admin-users-section animate-slide-up">
          <div className="section-header-row">
            <h2 className="dashboard-section-title">👥 Registered Users Management</h2>
          </div>

          {userSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{userSuccess}</div>}
          {userError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{userError}</div>}

          {loadingUsers ? (
            <div className="dashboard-loading-placeholder">
              <div className="spinner" /> Loading registered users...
            </div>
          ) : (
            <div className="admin-users-tables-container">
              {/* Grid of 3 side-by-side interactive cards */}
              <div className="admin-role-selector-cards">
                {/* Manufacturer Card */}
                <div
                  className={`role-select-card card manufacturer-card ${activeRole === "manufacturer" ? "active" : ""}`}
                  onClick={() => setActiveRole("manufacturer")}
                >
                  <div className="role-select-card-header">
                    <span className="role-select-icon">🏭</span>
                    <span className="role-select-count-badge">{manufacturers.length} Users</span>
                  </div>
                  <h3 className="role-select-title">Manufacturers</h3>
                  <p className="role-select-desc">Manage product producers & origins</p>
                  <div className="role-select-indicator" />
                </div>

                {/* Distributor Card */}
                <div
                  className={`role-select-card card distributor-card ${activeRole === "distributor" ? "active" : ""}`}
                  onClick={() => setActiveRole("distributor")}
                >
                  <div className="role-select-card-header">
                    <span className="role-select-icon">🚚</span>
                    <span className="role-select-count-badge">{distributors.length} Users</span>
                  </div>
                  <h3 className="role-select-title">Distributors</h3>
                  <p className="role-select-desc">Manage logistics & supply nodes</p>
                  <div className="role-select-indicator" />
                </div>

                {/* Retailer Card */}
                <div
                  className={`role-select-card card retailer-card ${activeRole === "retailer" ? "active" : ""}`}
                  onClick={() => setActiveRole("retailer")}
                >
                  <div className="role-select-card-header">
                    <span className="role-select-icon">🏪</span>
                    <span className="role-select-count-badge">{retailers.length} Users</span>
                  </div>
                  <h3 className="role-select-title">Retailers</h3>
                  <p className="role-select-desc">Manage points of sale & verification</p>
                  <div className="role-select-indicator" />
                </div>
              </div>

              {/* Table displaying the currently active role */}
              <div className="user-role-table-card card active-table-card">
                {activeRole === "manufacturer" && (
                  <>
                    <div className="role-card-header manufacturer-header">
                      <h3>🏭 Manufacturers List ({manufacturers.length})</h3>
                    </div>
                    <div className="table-responsive">
                      <table className="user-role-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th style={{ textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manufacturers.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="empty-row">No registered manufacturers found.</td>
                            </tr>
                          ) : (
                            manufacturers.map((u) => (
                              <tr key={u._id}>
                                <td className="user-name-cell">
                                  <span className="user-avatar-small">M</span>
                                  {u.name}
                                </td>
                                <td>{u.email}</td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    className="btn-remove-user-small"
                                    onClick={() => handleRemoveUser(u._id, u.name)}
                                    disabled={deletingId === u._id}
                                  >
                                    {deletingId === u._id ? "Removing..." : "❌ Remove"}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {activeRole === "distributor" && (
                  <>
                    <div className="role-card-header distributor-header">
                      <h3>🚚 Distributors List ({distributors.length})</h3>
                    </div>
                    <div className="table-responsive">
                      <table className="user-role-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th style={{ textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distributors.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="empty-row">No registered distributors found.</td>
                            </tr>
                          ) : (
                            distributors.map((u) => (
                              <tr key={u._id}>
                                <td className="user-name-cell">
                                  <span className="user-avatar-small">D</span>
                                  {u.name}
                                </td>
                                <td>{u.email}</td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    className="btn-remove-user-small"
                                    onClick={() => handleRemoveUser(u._id, u.name)}
                                    disabled={deletingId === u._id}
                                  >
                                    {deletingId === u._id ? "Removing..." : "❌ Remove"}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {activeRole === "retailer" && (
                  <>
                    <div className="role-card-header retailer-header">
                      <h3>🏪 Retailers List ({retailers.length})</h3>
                    </div>
                    <div className="table-responsive">
                      <table className="user-role-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th style={{ textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {retailers.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="empty-row">No registered retailers found.</td>
                            </tr>
                          ) : (
                            retailers.map((u) => (
                              <tr key={u._id}>
                                <td className="user-name-cell">
                                  <span className="user-avatar-small">R</span>
                                  {u.name}
                                </td>
                                <td>{u.email}</td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    className="btn-remove-user-small"
                                    onClick={() => handleRemoveUser(u._id, u.name)}
                                    disabled={deletingId === u._id}
                                  >
                                    {deletingId === u._id ? "Removing..." : "❌ Remove"}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}

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
          <img src="/assets/icons/parcel.png" alt="Box" className="decor-icon decor-box" />
          <img src="/assets/icons/location.png" alt="Pointer" className="decor-icon decor-pointer" />
          <img src="/assets/icons/truck.png" alt="Truck" className="decor-icon decor-truck" />
          <img src="/assets/icons/checklist.png" alt="Checklist" className="decor-icon decor-checklist" />
        </div>
      )}

      {/* Floating 3D SCM Illustrations for Distributor Role */}
      {user?.role === "distributor" && (
        <div className="distributor-decorations" aria-hidden="true">
          <img src="/assets/icons/distributor_trans.png" alt="Distributor" className="decor-icon decor-distributor-1" />
          <img src="/assets/icons/distributor2.png" alt="Distributor Alternative" className="decor-icon decor-distributor-2" />
        </div>
      )}

      {/* Floating 3D SCM Illustrations for Retailer Role */}
      {user?.role === "retailer" && (
        <div className="retailer-decorations" aria-hidden="true">
          <img src="/assets/icons/retail_store.png" alt="Retail Store" className="decor-icon decor-retailer-1" />
          <img src="/assets/icons/shopping.png" alt="Shopping" className="decor-icon decor-retailer-2" />
        </div>
      )}

      {/* Quote Tagline at bottom of screen */}
      <footer className={`dashboard-footer-quote ${isFooterVisible ? "" : "hide"}`}>
        <p className="dashboard-quote-text">
          "Moving products forward,preserving trust and transparency..."
        </p>
      </footer>
    </div>
  );
}
