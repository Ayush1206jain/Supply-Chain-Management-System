import React from "react";
import "./Auth.css";
import ThemeToggle from "../../components/ThemeToggle";


/**
 * Interactive floating metric cards surrounding the central login card.
 */


export default function AuthLayout({ children }) {
  return (
    <div className="auth-page-container">
      {/* Dynamic Grid Background */}
      <div className="auth-grid-overlay" />

      {/* Theme Toggle — top-right corner */}
      <div className="auth-theme-toggle-wrapper">
        <ThemeToggle />
      </div>


      {/* Main Flow SVG Layout */}
      <div className="auth-flow-wrapper">
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Definitions for circular clip-paths to make icon images fit round circles */}
          <defs>
            <clipPath id="clip-manufacturer">
              <circle cx="0" cy="0" r="44" />
            </clipPath>
            <clipPath id="clip-warehouse">
              <circle cx="0" cy="0" r="44" />
            </clipPath>
            <clipPath id="clip-distributor">
              <circle cx="0" cy="0" r="44" />
            </clipPath>
            <clipPath id="clip-retailer">
              <circle cx="0" cy="0" r="44" />
            </clipPath>
            <clipPath id="clip-customer">
              <circle cx="0" cy="0" r="44" />
            </clipPath>
          </defs>

          {/* Main Curved Dotted Route connecting all entities */}
          <path 
            d="M 120 450 C 220 450, 200 525, 310 525 C 420 525, 420 450, 520 450 C 620 450, 680 490, 740 490 M 1180 490 C 1240 490, 1300 525, 1400 525 C 1500 525, 1500 450, 1600 450 C 1700 450, 1680 450, 1800 450" 
            stroke="#7c3aed" 
            strokeWidth="3" 
            strokeDasharray="8 8" 
            opacity="0.4"
          />

          {/* Active Flow Line (dashes forward) */}
          <path 
            d="M 120 450 C 220 450, 200 525, 310 525 C 420 525, 420 450, 520 450 C 620 450, 680 490, 740 490 M 1180 490 C 1240 490, 1300 525, 1400 525 C 1500 525, 1500 450, 1600 450 C 1700 450, 1680 450, 1800 450" 
            stroke="#a78bfa" 
            strokeWidth="3.5" 
            strokeDasharray="12 24" 
            className="route-flow-animation"
          />

          {/* Node 1: Manufacturer */}
          <g transform="translate(120, 450)">
            <circle r="48" fill="#1a1a2e" stroke="#7c3aed" strokeWidth="1.5" filter="drop-shadow(0 8px 20px rgba(139,92,246,0.15))" />
            <image href="/assets/icons/manufacturer.png" x="-44" y="-44" width="88" height="88" clipPath="url(#clip-manufacturer)" />
            <circle r="6" fill="#a78bfa" transform="translate(0, 56)" />
            <text y="96" textAnchor="middle" className="auth-svg-node-title" fontSize="17" fontWeight="700" fontFamily="Inter, sans-serif">Manufacturer</text>
            <text y="116" textAnchor="middle" className="auth-svg-node-subtitle" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">Raw Materials &amp; Production</text>
          </g>

          {/* Node 2: Warehouse */}
          <g transform="translate(310, 525)">
            <circle r="48" fill="#1a1a2e" stroke="#7c3aed" strokeWidth="1.5" filter="drop-shadow(0 8px 20px rgba(139,92,246,0.15))" />
            <image href="/assets/icons/warehouse.png" x="-44" y="-44" width="88" height="88" clipPath="url(#clip-warehouse)" />
            <circle r="6" fill="#a78bfa" transform="translate(0, 56)" />
            <text y="96" textAnchor="middle" className="auth-svg-node-title" fontSize="17" fontWeight="700" fontFamily="Inter, sans-serif">Warehouse</text>
            <text y="116" textAnchor="middle" className="auth-svg-node-subtitle" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">Storage &amp; Inventory</text>
          </g>

          {/* Node 3: Distributor */}
          <g transform="translate(520, 450)">
            <circle r="48" fill="#1a1a2e" stroke="#7c3aed" strokeWidth="1.5" filter="drop-shadow(0 8px 20px rgba(139,92,246,0.15))" />
            <image href="/assets/icons/distributor.png" x="-44" y="-44" width="88" height="88" clipPath="url(#clip-distributor)" />
            <circle r="6" fill="#a78bfa" transform="translate(0, 56)" />
            <text y="96" textAnchor="middle" className="auth-svg-node-title" fontSize="17" fontWeight="700" fontFamily="Inter, sans-serif">Distributor</text>
            <text y="116" textAnchor="middle" className="auth-svg-node-subtitle" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">Transportation &amp; Distribution</text>
          </g>

          {/* Node 4: Retailer */}
          <g transform="translate(1400, 525)">
            <circle r="48" fill="#1a1a2e" stroke="#7c3aed" strokeWidth="1.5" filter="drop-shadow(0 8px 20px rgba(139,92,246,0.15))" />
            <image href="/assets/icons/retailer.png" x="-44" y="-44" width="88" height="88" clipPath="url(#clip-retailer)" />
            <circle r="6" fill="#a78bfa" transform="translate(0, 56)" />
            <text y="96" textAnchor="middle" className="auth-svg-node-title" fontSize="17" fontWeight="700" fontFamily="Inter, sans-serif">Retailer</text>
            <text y="116" textAnchor="middle" className="auth-svg-node-subtitle" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">Sales &amp; Fulfillment</text>
          </g>

          {/* Node 5: Customer */}
          <g transform="translate(1600, 450)">
            <circle r="48" fill="#1a1a2e" stroke="#7c3aed" strokeWidth="1.5" filter="drop-shadow(0 8px 20px rgba(139,92,246,0.15))" />
            <image href="/assets/icons/customer.png" x="-44" y="-44" width="88" height="88" clipPath="url(#clip-customer)" />
            <circle r="6" fill="#a78bfa" transform="translate(0, 56)" />
            <text y="96" textAnchor="middle" className="auth-svg-node-title" fontSize="17" fontWeight="700" fontFamily="Inter, sans-serif">Customer</text>
            <text y="116" textAnchor="middle" className="auth-svg-node-subtitle" fontSize="13" fontWeight="500" fontFamily="Inter, sans-serif">End User Delivery</text>
          </g>

          {/* Floating abstract structure cubes */}
          <g opacity="0.18" stroke="#7c3aed" strokeWidth="1.5" fill="none">
            <g transform="translate(150, 180) scale(0.7)" className="float-fast-1">
              <path d="M30 10 L60 25 L60 55 L30 40 Z M30 10 L0 25 L0 55 L30 40 Z M30 10 L60 25 L30 40 L0 25 Z" />
            </g>
            <g transform="translate(380, 260) scale(0.6)" className="float-fast-2">
              <path d="M30 10 L60 25 L60 55 L30 40 Z M30 10 L0 25 L0 55 L30 40 Z M30 10 L60 25 L30 40 L0 25 Z" />
            </g>
            <g transform="translate(1520, 220) scale(0.6)" className="float-fast-3">
              <path d="M30 10 L60 25 L60 55 L30 40 Z M30 10 L0 25 L0 55 L30 40 Z M30 10 L60 25 L30 40 L0 25 Z" />
            </g>
            <g transform="translate(1420, 680) scale(0.7)" className="float-fast-4">
              <path d="M30 10 L60 25 L60 55 L30 40 Z M30 10 L0 25 L0 55 L30 40 Z M30 10 L60 25 L30 40 L0 25 Z" />
            </g>
          </g>
        </svg>
      </div>

      {/* Dedicated bottom-anchored container for the scalable vector line art landscape */}
      <div className="auth-bottom-landscape-container">
        <svg width="100%" height="100%" viewBox="0 0 1920 140" preserveAspectRatio="xMidYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g opacity="0.2">
            {/* Ground line stretching entire width */}
            <line x1="0" y1="120" x2="1920" y2="120" stroke="#7c3aed" strokeWidth="2"/>

            {/* Industrial Factory Silhouette */}
            <g transform="translate(60, 40)">
              <rect x="0" y="30" width="180" height="50" fill="none" stroke="#7c3aed" strokeWidth="2"/>
              <path d="M0 30 L40 0 L40 30 L80 0 L80 30 L120 0 L120 30 L160 0 L160 30" fill="none" stroke="#7c3aed" strokeWidth="2"/>
              <rect x="20" y="50" width="15" height="15" stroke="#7c3aed" strokeWidth="1.5"/>
              <rect x="50" y="50" width="15" height="15" stroke="#7c3aed" strokeWidth="1.5"/>
              <rect x="80" y="50" width="15" height="15" stroke="#7c3aed" strokeWidth="1.5"/>
              <line x1="140" y1="30" x2="140" y2="-20" stroke="#7c3aed" strokeWidth="3"/>
              <line x1="160" y1="30" x2="160" y2="-20" stroke="#7c3aed" strokeWidth="3"/>
              {/* Smoke puffs */}
              <circle cx="140" cy="-30" r="6" stroke="#a78bfa" strokeWidth="1.5" fill="none"/>
              <circle cx="148" cy="-40" r="8" stroke="#a78bfa" strokeWidth="1.5" fill="none"/>
              <circle cx="160" cy="-30" r="6" stroke="#a78bfa" strokeWidth="1.5" fill="none"/>
              <circle cx="168" cy="-40" r="8" stroke="#a78bfa" strokeWidth="1.5" fill="none"/>
            </g>

            {/* Path connecting Factory to Truck Location Pin */}
            <path d="M 240 120 H 350" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Pin 1 */}
            <g transform="translate(350, 85)">
              <path d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 30 12 30 C12 30 24 21 24 12 C24 5.4 18.6 0 12 0 Z" fill="#7c3aed" fillOpacity="0.25" stroke="#a78bfa" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="#a78bfa"/>
            </g>

            {/* Dotted path behind Truck */}
            <path d="M 374 120 Q 420 140 480 120 T 560 120" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Logistics Truck */}
            <g transform="translate(490, 72)">
              <rect x="0" y="5" width="75" height="38" fill="none" stroke="#7c3aed" strokeWidth="2" rx="2"/>
              <path d="M75 15 H95 L102 28 V43 H75 Z" fill="#7c3aed" fillOpacity="0.15" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round"/>
              <circle cx="20" cy="48" r="8" fill="#1a1a2e" stroke="#a78bfa" strokeWidth="2"/>
              <circle cx="80" cy="48" r="8" fill="#1a1a2e" stroke="#a78bfa" strokeWidth="2"/>
              <line x1="12" y1="20" x2="60" y2="20" stroke="#7c3aed" strokeWidth="1.5"/>
            </g>

            {/* Path connecting Truck to Pin 2 */}
            <path d="M 600 120 H 710" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Pin 2 */}
            <g transform="translate(710, 85)">
              <path d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 30 12 30 C12 30 24 21 24 12 C24 5.4 18.6 0 12 0 Z" fill="#7c3aed" fillOpacity="0.25" stroke="#a78bfa" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="#a78bfa"/>
            </g>

            {/* Path to Central Warehouse */}
            <path d="M 734 120 H 830" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Central Warehouse Silhouette */}
            <g transform="translate(830, 40)">
              <path d="M0 40 L90 10 L180 40 V80 H0 Z" fill="none" stroke="#7c3aed" strokeWidth="2"/>
              <rect x="55" y="42" width="70" height="38" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="2"/>
              <line x1="90" y1="42" x2="90" y2="80" stroke="#a78bfa" strokeWidth="1.5"/>
              {/* Stacked packages next to warehouse */}
              <rect x="135" y="55" width="20" height="25" fill="none" stroke="#7c3aed" strokeWidth="1.5"/>
              <rect x="140" y="65" width="10" height="15" fill="none" stroke="#7c3aed" strokeWidth="1"/>
            </g>

            {/* Path to Pin 3 */}
            <path d="M 1010 120 H 1120" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Pin 3 */}
            <g transform="translate(1120, 85)">
              <path d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 30 12 30 C12 30 24 21 24 12 C24 5.4 18.6 0 12 0 Z" fill="#7c3aed" fillOpacity="0.25" stroke="#a78bfa" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="#a78bfa"/>
            </g>

            {/* Dotted route behind retail */}
            <path d="M 1144 120 Q 1200 140 1260 120 T 1340 120" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Retail Shop Storefront */}
            <g transform="translate(1320, 60)">
              <rect x="10" y="20" width="105" height="40" fill="none" stroke="#7c3aed" strokeWidth="2"/>
              <path d="M0 20 H125 L115 5 H10 Z" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
              <rect x="45" y="35" width="35" height="25" fill="#1a1a2e" stroke="#a78bfa" strokeWidth="1.5"/>
              <line x1="25" y1="20" x2="25" y2="60" stroke="#a78bfa" strokeWidth="1"/>
              <line x1="100" y1="20" x2="100" y2="60" stroke="#a78bfa" strokeWidth="1"/>
            </g>

            {/* Path to Pin 4 */}
            <path d="M 1445 120 H 1550" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Pin 4 */}
            <g transform="translate(1550, 85)">
              <path d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 30 12 30 C12 30 24 21 24 12 C24 5.4 18.6 0 12 0 Z" fill="#7c3aed" fillOpacity="0.25" stroke="#a78bfa" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="#a78bfa"/>
            </g>

            {/* Path to House */}
            <path d="M 1574 120 H 1670" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 6"/>

            {/* Residential House */}
            <g transform="translate(1670, 60)">
              <path d="M0 25 L45 0 L90 25 Z" fill="none" stroke="#7c3aed" strokeWidth="2"/>
              <rect x="10" y="25" width="70" height="35" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="2"/>
              <rect x="35" y="38" width="20" height="22" fill="#1a1a2e" stroke="#a78bfa" strokeWidth="1.5"/>
              <circle cx="70" cy="40" r="4" stroke="#a78bfa" strokeWidth="1.5" fill="none"/>
            </g>
          </g>
        </svg>
      </div>

      {/* Central Login / Register Card Container Slot */}
      <div className="auth-main-content">
        {/* Top Brand Name */}
        <div className="auth-outer-brand animate-fade-in">
          <span className="auth-logo">⛓</span>
          <span className="auth-outer-brand-name">BlockTrace</span>
        </div>

        <h1 className="auth-outer-tagline animate-fade-in">
          From Factory to Customer
          <span className="tagline-gradient tagline-sub-block">Verify At Every Step</span>
        </h1>

        <div className="auth-center-wrapper">

          
          {/* Render Form Card */}
          {children}
        </div>
      </div>
    </div>
  );
}
