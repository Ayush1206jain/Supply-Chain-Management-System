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
        viewBox="0 0 1000 1000"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="supply-chain-svg"
      >
        {/* Animated Dashed Connection Line */}
        <path
          d="M 80,150 L 80,450 L 80,800 L 920,800 L 920,450 L 920,150"
          className="route-line"
        />

        {/* Node 1: Factory (80, 150) */}
        <g className="node-group node-factory">
          <g transform="translate(80, 150)">
            {/* Squared Container outline */}
            <rect x="-22" y="-22" width="44" height="44" rx="6" className="node-square-box" />
            <g transform="scale(1.1)">
              <path
                d="M-12,12 V-2 L-4,-6 V-2 L4,-6 V-2 L12,-6 V12 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <line x1="-12" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" />
              <line x1="-6" y1="4" x2="-2" y2="4" stroke="currentColor" strokeWidth="1.8" />
              <line x1="-6" y1="8" x2="-2" y2="8" stroke="currentColor" strokeWidth="1.8" />
              <line x1="2" y1="4" x2="6" y2="4" stroke="currentColor" strokeWidth="1.8" />
              <line x1="2" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1.8" />
            </g>
          </g>
          <text x="80" y="200" className="node-label">Factory</text>
        </g>

        {/* Node 2: Warehouse (80, 450) */}
        <g className="node-group node-warehouse">
          <g transform="translate(80, 450)">
            {/* Squared Container outline */}
            <rect x="-22" y="-22" width="44" height="44" rx="6" className="node-square-box" />
            <g transform="scale(1.1)">
              <path
                d="M-14,10 V-4 L0,-12 L14,-4 V10 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M-6,10 V4 H6 V10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <line x1="-14" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.8" />
              <line x1="0" y1="-12" x2="0" y2="10" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2,2" />
            </g>
          </g>
          <text x="80" y="500" className="node-label">Warehouse</text>
        </g>

        {/* Node 3: Truck/Transport Hub (80, 800) */}
        <g className="node-group node-truck">
          <g transform="translate(80, 800)">
            {/* Squared Container outline */}
            <rect x="-22" y="-22" width="44" height="44" rx="6" className="node-square-box" />
            <g transform="scale(1.1)">
              <path
                d="M-14,6 V-8 H2 L8,-2 V6 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <line x1="2" y1="-8" x2="2" y2="6" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="-6" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="5" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <line x1="-14" y1="6" x2="-8.5" y2="6" stroke="currentColor" strokeWidth="1.8" />
              <line x1="-3.5" y1="6" x2="2" y2="6" stroke="currentColor" strokeWidth="1.8" />
            </g>
          </g>
          <text x="80" y="850" className="node-label">Logistics Hub</text>
        </g>

        {/* Node 4: Distribution Center (920, 800) */}
        <g className="node-group node-dc">
          <g transform="translate(920, 800)">
            {/* Squared Container outline */}
            <rect x="-22" y="-22" width="44" height="44" rx="6" className="node-square-box" />
            <g transform="scale(1.1)">
              <path
                d="M-12,10 V-6 H12 V10 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M-15,-6 H15" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="0" cy="2" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <line x1="-4.5" y1="2" x2="4.5" y2="2" stroke="currentColor" strokeWidth="1.3" />
              <line x1="0" y1="-2.5" x2="0" y2="6.5" stroke="currentColor" strokeWidth="1.3" />
            </g>
          </g>
          <text x="920" y="850" className="node-label">Dist. Center</text>
        </g>

        {/* Node 5: Retailer (920, 450) */}
        <g className="node-group node-retail">
          <g transform="translate(920, 450)">
            {/* Squared Container outline */}
            <rect x="-22" y="-22" width="44" height="44" rx="6" className="node-square-box" />
            <g transform="scale(1.1)">
              <path
                d="M-12,10 V-2 L-14,-6 L0,-10 L14,-6 L12,-2 V10 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M-14,-6 H14" stroke="currentColor" strokeWidth="1.8" />
              <rect x="-4" y="4" width="8" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <line x1="-7" y1="-6" x2="-7" y2="-2" stroke="currentColor" strokeWidth="1.3" />
              <line x1="0" y1="-10" x2="0" y2="-2" stroke="currentColor" strokeWidth="1.3" />
              <line x1="7" y1="-6" x2="7" y2="-2" stroke="currentColor" strokeWidth="1.3" />
            </g>
          </g>
          <text x="920" y="500" className="node-label">Retail Store</text>
        </g>

        {/* Node 6: Customer (920, 150) */}
        <g className="node-group node-customer">
          <g transform="translate(920, 150)">
            {/* Squared Container outline */}
            <rect x="-22" y="-22" width="44" height="44" rx="6" className="node-square-box" />
            <g transform="scale(1.1)">
              <path
                d="M-12,-10 H-8 L-4,2 H8 L12,-6 H-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx="-2" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="6" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </g>
          </g>
          <text x="920" y="200" className="node-label">Customer</text>
        </g>

        {/* Moving Package 1 */}
        <g className="moving-package">
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <animateMotion
            path="M 80,150 L 80,450 L 80,800 L 920,800 L 920,450 L 920,150"
            dur="24s"
            repeatCount="indefinite"
            begin="0s"
          />
        </g>

        {/* Moving Package 2 */}
        <g className="moving-package">
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <animateMotion
            path="M 80,150 L 80,450 L 80,800 L 920,800 L 920,450 L 920,150"
            dur="24s"
            repeatCount="indefinite"
            begin="6s"
          />
        </g>

        {/* Moving Package 3 */}
        <g className="moving-package">
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <animateMotion
            path="M 80,150 L 80,450 L 80,800 L 920,800 L 920,450 L 920,150"
            dur="24s"
            repeatCount="indefinite"
            begin="12s"
          />
        </g>

        {/* Moving Package 4 */}
        <g className="moving-package">
          <rect x="-6" y="-6" width="12" height="12" rx="1.5" />
          <animateMotion
            path="M 80,150 L 80,450 L 80,800 L 920,800 L 920,450 L 920,150"
            dur="24s"
            repeatCount="indefinite"
            begin="18s"
          />
        </g>
      </svg>
    </div>
  );
}
