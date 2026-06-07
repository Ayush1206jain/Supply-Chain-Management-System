import React from "react";
import "./SupplyChainBackground.css";

/**
 * SupplyChainBackground — Day 14 UI Polish
 * Renders:
 * 1. A fixed background layout of 6 squared container nodes (Factory -> Warehouse -> Logistics Hub -> Dist. Center -> Retail Store -> Customer)
 * 2. Animated dotted route connection path with crawling square delivery package nodes.
 * 3. Delicate, floating SCM enterprise icons in the empty viewport margins.
 */
export default function SupplyChainBackground() {
  return (
    <div className="supply-chain-bg" aria-hidden="true">
      {/* ── Floating SCM Icons ── */}
      <div className="floating-icon float-1" title="Truck">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 18H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="7.5" cy="18" r="2" />
          <circle cx="18.5" cy="18" r="2" />
        </svg>
      </div>

      <div className="floating-icon float-2" title="Package">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>

      <div className="floating-icon float-3" title="Warehouse">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 21h18" />
          <path d="M3 10v11" />
          <path d="M21 10v11" />
          <path d="M12 2L3 10h18L12 2z" />
          <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
        </svg>
      </div>

      <div className="floating-icon float-4" title="Barcode">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="3" y1="5" x2="3" y2="19" />
          <line x1="6" y1="5" x2="6" y2="19" strokeWidth="2.5" />
          <line x1="11" y1="5" x2="11" y2="19" />
          <line x1="14" y1="5" x2="14" y2="19" strokeWidth="2" />
          <line x1="18" y1="5" x2="18" y2="19" strokeWidth="2.5" />
          <line x1="21" y1="5" x2="21" y2="19" />
        </svg>
      </div>

      <div className="floating-icon float-5" title="QR Code">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="6" height="6" />
          <rect x="15" y="3" width="6" height="6" />
          <rect x="3" y="15" width="6" height="6" />
          <path d="M15 15h2v2h-2zm4 4h2v2h-2zm0-4h2v2h-2zm-4 4h2v2h-2z" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <div className="floating-icon float-6" title="Inventory Shelf">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>

      <div className="floating-icon float-7" title="Shipping Container">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="5" width="20" height="14" rx="1" />
          <line x1="6" y1="5" x2="6" y2="19" />
          <line x1="10" y1="5" x2="10" y2="19" />
          <line x1="14" y1="5" x2="14" y2="19" />
          <line x1="18" y1="5" x2="18" y2="19" />
        </svg>
      </div>

      <div className="floating-icon float-8" title="Location Pin">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      {/* ── SVG Logistics Network ── */}
      <svg
        viewBox="0 0 1800 1000"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="supply-chain-svg"
      >
        {/* Animated Dashed Connection Line */}
        <path
          d="M -30,150 L -30,500 L -30,850 L 1830,850 L 1830,500 L 1830,150"
          className="route-line"
        />

        {/* Node 1: Factory (-30, 150) */}
        <g className="node-group node-factory">
          <g transform="translate(-30, 150)">
            <image href="/assets/icons/manufacturer.png" x="-45" y="-45" width="90" height="90" />
          </g>
          <text x="-30" y="220" className="node-label">Factory</text>
        </g>

        {/* Node 2: Warehouse (-30, 500) */}
        <g className="node-group node-warehouse">
          <g transform="translate(-30, 500)">
            <image href="/assets/icons/warehouse.png" x="-55" y="-55" width="110" height="110" />
          </g>
          <text x="-30" y="575" className="node-label">Warehouse</text>
        </g>

        {/* Node 3: Logistics Hub (-30, 850) */}
        <g className="node-group node-truck">
          <g transform="translate(-30, 850)">
            <image href="/assets/icons/logistic_hub.png" x="-45" y="-45" width="90" height="90" />
          </g>
          <text x="-30" y="920" className="node-label">Logistics Hub</text>
        </g>

        {/* Node 4: Distribution Center (1830, 850) */}
        <g className="node-group node-dc">
          <g transform="translate(1830, 850)">
            <image href="/assets/icons/distribution_center.png" x="-45" y="-45" width="90" height="90" />
          </g>
          <text x="1830" y="920" className="node-label">Distribution centers</text>
        </g>

        {/* Node 5: Retailer (1830, 500) */}
        <g className="node-group node-retail">
          <g transform="translate(1830, 500)">
            <image href="/assets/icons/retailer.png" x="-45" y="-45" width="90" height="90" />
          </g>
          <text x="1830" y="570" className="node-label">Retail Store</text>
        </g>

        {/* Node 6: Customer (1830, 150) */}
        <g className="node-group node-customer">
          <g transform="translate(1830, 150)">
            <image href="/assets/icons/customer.png" x="-45" y="-45" width="90" height="90" />
          </g>
          <text x="1830" y="220" className="node-label">Customer</text>
        </g>

        {/* Moving Truck 1 */}
        <g className="moving-truck">
          <image
            href="/assets/icons/truck.png"
            x="-30"
            y="-30"
            width="60"
            height="60"
          />
          <animateMotion
            path="M -30,150 L -30,500 L -30,850 L 1830,850 L 1830,500 L 1830,150"
            dur="24s"
            repeatCount="indefinite"
            rotate="auto"
            begin="0s"
          />
        </g>

        {/* Moving Package 2 */}
        <g className="moving-package">
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <animateMotion
            path="M -30,150 L -30,500 L -30,850 L 1830,850 L 1830,500 L 1830,150"
            dur="24s"
            repeatCount="indefinite"
            begin="6s"
          />
        </g>

        {/* Moving Truck 2 */}
        <g className="moving-truck">
          <image
            href="/assets/icons/truck.png"
            x="-30"
            y="-30"
            width="60"
            height="60"
          />
          <animateMotion
            path="M -30,150 L -30,500 L -30,850 L 1830,850 L 1830,500 L 1830,150"
            dur="24s"
            repeatCount="indefinite"
            rotate="auto"
            begin="12s"
          />
        </g>

        {/* Moving Package 4 */}
        <g className="moving-package">
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <animateMotion
            path="M -30,150 L -30,500 L -30,850 L 1830,850 L 1830,500 L 1830,150"
            dur="24s"
            repeatCount="indefinite"
            begin="18s"
          />
        </g>
      </svg>
    </div>
  );
}
