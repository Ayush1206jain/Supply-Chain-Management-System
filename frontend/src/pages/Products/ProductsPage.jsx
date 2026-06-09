import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { listProducts, createProduct, getProductStatus } from "../../api/productService";
import SupplyChainBackground from "../../components/SupplyChainBackground";
import "./Products.css";

/**
 * ProductsPage — Day 14
 * - Any authenticated user can browse all products.
 * - Manufacturer and Admin can create a new product via the inline form.
 * - Shows blockchain anchor status badge per card.
 */
export default function ProductsPage() {
  const { user } = useAuth();
  const canCreate = user?.role === "manufacturer" || user?.role === "admin";

  const [products, setProducts]       = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError]     = useState("");
  const [showForm, setShowForm]       = useState(false);

  // ── Form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    sku: "", name: "", description: "", price: "",
  });
  const [formError, setFormError]     = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [creating, setCreating]       = useState(false);

  // ── Fetch products ───────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingList(true);
      setListError("");
      const data = await listProducts();
      setProducts(data.products ?? []);
    } catch (err) {
      setListError(
        err.response?.data?.message || "Failed to load products. Is the backend running?"
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Form handlers ────────────────────────────────────────────────────
  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.sku.trim() || !form.name.trim() || !form.price) {
      setFormError("SKU, name and price are required.");
      return;
    }
    const priceVal = parseFloat(form.price);
    if (isNaN(priceVal) || priceVal < 0) {
      setFormError("Price must be a valid positive number.");
      return;
    }

    try {
      setCreating(true);
      await createProduct({
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        price: priceVal,
      });
      setFormSuccess("✅ Product registered successfully!");
      setForm({ sku: "", name: "", description: "", price: "" });
      await fetchProducts(); // refresh the list
      // Auto-hide success message after 3s
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create product.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="products-page animate-fade-in" id="products-page">
      <SupplyChainBackground />
      {/* Header */}
      <div className="products-header">
        <h1 className="products-title">📦 Products</h1>
        {canCreate && (
          <button
            className="btn btn-primary"
            id="btn-toggle-create"
            onClick={() => {
              setShowForm((v) => !v);
              setFormError("");
              setFormSuccess("");
            }}
          >
            {showForm ? "✕ Cancel" : "+ Register Product"}
          </button>
        )}
      </div>

      {/* Create product form (manufacturers / admins) */}
      {canCreate && showForm && (
        <div className="create-panel" id="create-product-panel">
          <div className="create-panel-header">
            <span className="create-panel-icon">🏭</span>
            <h2 className="create-panel-title">Register New Product</h2>
          </div>

          {formError && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              ⚠️ {formError}
            </div>
          )}
          {formSuccess && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              {formSuccess}
            </div>
          )}

          <form className="create-form" onSubmit={handleCreate} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="input-sku">SKU *</label>
              <input
                id="input-sku"
                className="form-input"
                name="sku"
                placeholder="e.g. PROD-2024-001"
                value={form.sku}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-price">Price (INR) *</label>
              <input
                id="input-price"
                className="form-input"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 15000"
                value={form.price}
                onChange={handleChange}
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label" htmlFor="input-name">Product Name *</label>
              <input
                id="input-name"
                className="form-input"
                name="name"
                placeholder="e.g. Industrial Valve Model X"
                value={form.name}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label" htmlFor="input-description">
                Description <span style={{ fontWeight: 400, color: "var(--clr-text-muted)" }}>(optional)</span>
              </label>
              <input
                id="input-description"
                className="form-input"
                name="description"
                placeholder="Brief product description…"
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="create-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowForm(false); setFormError(""); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                id="btn-create-product"
                disabled={creating}
              >
                {creating ? <><span className="spinner" /> Registering…</> : "Register on Chain"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products list */}
      <div className="products-list-header">
        <h2 className="products-count">
          {loadingList ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""} found`}
        </h2>
        <button
          className="btn btn-ghost"
          id="btn-refresh-products"
          onClick={fetchProducts}
          style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)" }}
          disabled={loadingList}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error state */}
      {listError && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ {listError}
        </div>
      )}

      {/* Loading skeleton */}
      {loadingList && (
        <div className="products-grid">
          {[1, 2, 3].map((i) => (
            <div className="skeleton-card" key={i}>
              <div className="skeleton-line" style={{ height: 22, width: "60%" }} />
              <div className="skeleton-line" style={{ height: 14, width: "40%" }} />
              <div className="skeleton-line" style={{ height: 14, width: "80%" }} />
              <div className="skeleton-line" style={{ height: 14, width: "70%" }} />
              <div className="skeleton-line" style={{ height: 20, width: "30%", marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loadingList && !listError && products.length === 0 && (
        <div className="products-empty">
          <span className="products-empty-icon">📭</span>
          <p className="products-empty-title">No products yet</p>
          <p>
            {canCreate
              ? `Click "Register Product" above to add the first product.`
              : "No products have been registered by a manufacturer yet."}
          </p>
        </div>
      )}

      {/* Products grid */}
      {!loadingList && products.length > 0 && (
        <div className="products-grid stagger">
          {products.map((p, i) => (
            <ProductCard key={p._id} product={p} index={i} />
          ))}
        </div>
      )}

      {/* Quote Tagline */}
      <footer className="products-footer-quote">
        <p className="quote-text">
          Every product has a journey. Every transfer leaves a verified trace. 🔍
        </p>
      </footer>
    </div>
  );
}

/** Status label + icon map for the P2 ProductStatus enum */
const STATUS_MAP = {
  CREATED:          { label: "Created",     icon: "🔵" },
  IN_TRANSIT:       { label: "In Transit",  icon: "🚚" },
  DELIVERED:        { label: "Delivered",   icon: "✅" },
  DISPUTED:         { label: "⚠ Disputed",  icon: "🔴" },
  NOT_ANCHORED:     { label: "Not On-Chain",icon: "⏳" },
  CHAIN_UNAVAILABLE:{ label: "Chain Offline",icon: "⚡" },
};

/** Individual product card — Day 3 (P1): now fetches live chainStatus */
function ProductCard({ product, index }) {
  const isAnchored = !!product.blockchainTxHash;
  const [chainStatus, setChainStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    getProductStatus(product._id)
      .then((data) => { if (!cancelled) setChainStatus(data.chainStatus || "NOT_ANCHORED"); })
      .catch(() => { if (!cancelled) setChainStatus("CHAIN_UNAVAILABLE"); });
    return () => { cancelled = true; };
  }, [product._id]);

  const statusInfo = STATUS_MAP[chainStatus] || { label: chainStatus, icon: "⏳" };
  const isDisputed = chainStatus === "DISPUTED";

  return (
    <div
      className={`product-card animate-slide-up${isDisputed ? " disputed-card" : ""}`}
      id={`product-card-${product._id}`}
      style={{ animationDelay: `${index * 60}ms`, borderColor: isDisputed ? "rgba(248,113,113,0.5)" : undefined }}
    >
      <div className="product-card-top">
        <div>
          <p className="product-name">{product.name}</p>
          <p className="product-sku">SKU: {product.sku}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          {/* Existing blockchain anchor badge */}
          <span className={`product-chain-badge ${isAnchored ? "anchored" : "pending"}`}>
            {isAnchored ? "⛓ On-Chain" : "⏳ Pending"}
          </span>
          {/* Day 3 (P1): Live ProductStatus enum badge */}
          <span className={`chain-status-badge status-${chainStatus}`}>
            {chainStatus === "loading" ? "…" : `${statusInfo.icon} ${statusInfo.label}`}
          </span>
        </div>
      </div>

      {product.description && (
        <p className="product-description">{product.description}</p>
      )}

      {isDisputed && (
        <div className="alert alert-error" style={{ padding: "6px 12px", fontSize: "var(--font-size-xs)", margin: "8px 0" }}>
          ⚠️ This product has been flagged as <strong>DISPUTED</strong> on-chain.
        </div>
      )}

      <div className="product-meta">
        <span className="product-price">₹{Number(product.price).toFixed(2)}</span>
        <span className="product-owner" title={product.owner?.email}>
          👤 {product.owner?.email ?? "Unknown"}
        </span>
      </div>
    </div>
  );
}
