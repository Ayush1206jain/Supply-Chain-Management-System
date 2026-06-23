# BlockTrace — Enterprise Blockchain Supply Chain Management System

**A high-performance, decentralized provenance tracking platform combining off-chain MongoDB velocity with on-chain Ethereum immutability. Featuring secure multi-signature handshakes, real-time WebSocket notifications, administrative governance mechanisms, and cross-layer audit verification.**

---

## 📋 Table of Contents

- [✨ Key Updates \& Advanced Features](#-key-updates--advanced-features)
- [🏗 System Architecture](#-system-architecture)
- [🛠 Tech Stack Matrix](#-tech-stack-matrix)
- [📁 Project Directory Structure](#-project-directory-structure)
- [🚀 Getting Started](#-getting-started)
- [🔐 Environmental Configuration](#-environmental-configuration)
- [📡 API Reference Blueprint](#-api-reference-blueprint)
- [👥 Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [🧪 Automated Testing](#-automated-testing)
- [📮 Postman Integration](#-postman-integration)
- [🏁 17-Day Feature Development Roadmap](#-17-day-feature-development-roadmap)

---

## ✨ Key Updates & Advanced Features

BlockTrace has been upgraded to a production-ready supply chain transparency platform with the following advanced subsystems:

### 🤝 2-Step Multi-Signature Ownership Handshake
To prevent accidental or malicious transfers, unilateral ownership transfers have been replaced with a secure two-step contract handshake:
1. **Initiate Transfer:** The current owner initiates a transfer request on-chain (`initiateTransfer(productId, recipient)`), moving the product status to `IN_TRANSIT` and locking it against other transfers.
2. **Confirm Transfer:** The designated recipient verifies the item and calls `confirmTransfer(productId)` on-chain. The smart contract updates the owner address, marks the state as `DELIVERED`, and releases the lock.

### ⚠️ Decentralized Governance & Dispute Resolution
Admins can flag disputed, stolen, or counterfeit goods on-chain using the `flagDispute(productId)` transaction. 
- Flags the item's on-chain status permanently as `DISPUTED`.
- Freezes ownership, preventing any further multi-sig transfers.
- Injects a red hazard warning banner directly into the **Audit Trail** screen to notify downstream buyers of counterfeit status.
- Admins can evaluate dispute reports submitted by users and choose to either escalate them to the blockchain or reject them.

### ⚡ Real-Time WebSockets & Ethereum Event Listener
A backend daemon powered by **Ethers.js** monitors smart contract events directly on the blockchain network:
- Listens for `ProductRegistered`, `TransferInitiated`, `TransferConfirmed`, and `DisputeRaised` events.
- Maps Ethereum events back to corresponding MongoDB records.
- Broadcasts real-time notifications to connected clients via **Socket.io**.
- Updates the interactive **Notification Bell** in the frontend navbar, showing real-time counters and action buttons (e.g., direct approval triggers for pending transfers).
- Integrated with the **HTML5 Web Notification API** to alert users when the app is in a background tab.
- Generates structured logs in `backend/event_listener.log` for auditable tracking of server-chain synchronization.

### 👥 Admin User Management Console
Admins have access to a dedicated user management dashboard inside the home panel.
- Displays all registered accounts, their roles, and metadata.
- Enables account lifecycle management, including user deletion (`DELETE /api/auth/users/:id`) to maintain platform security.

### 🔍 Multi-Faceted Product Search & Pagination
- Implements MongoDB compound text indexes across `sku`, `name`, and `description` for high-speed queries.
- Support for offset-based pagination (`page`, `limit`), sorting (`asc`, `desc`), and status-based filtering (`syncStatus` and live blockchain status).
- Interactive filter bar in the UI with instant loading indicators.

### 🎨 Premium UI/UX Polish
- Custom-built dark/light theme toggle using global CSS variables and responsive glassmorphism styles.
- Skeleton shimmer loaders for seamless asynchronous updates.
- Micro-animations, clipboard-copying utilities for blockchain hashes, and a scroll-triggered footer tagline that glides into view when scrolling to the page bottom.

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                              │
│   Manufacturer   │   Distributor   │   Retailer   │   Admin         │
│          React SPA (Vite + React Router v6 + Socket.io Client)         │
└──────────────────┬──────────────────────────────────┬──────────────────┘
                   │ HTTP / REST                      │ Real-time Events
                   │ (Axios + JWT Bearer)             │ (WebSockets)
┌──────────────────▼──────────────────────────────────▼──────────────────┐
│                         Backend API (Express)                          │
│  Auth (JWT+RBAC) │ Products │ Transfers │ Disputes │ Audit │ Sync      │
│  ────────────────────────────────────────────────────────────────────  │
│  Ethers.js Daemon (Event Listener)  │  Socket.io Server (Push Engine)  │
└──────────┬──────────────────────────────────┬──────────────────────────┘
           │ Read/Write                       │ Listen/Call
┌──────────▼──────────┐              ┌────────▼──────────────────────────┐
│  MongoDB (Mongoose)  │              │    Ethereum Smart Contracts      │
│  Users, Products,   │              │    SupplyChainRegistry.sol        │
│  Transfers, Disputes│              │    - registerProduct()            │
│  Status tracking    │              │    - initiateTransfer()           │
│                     │              │    - confirmTransfer()            │
└─────────────────────┘              │    - flagDispute()                │
                                     └───────────────────────────────────┘
```

### Event & Notification Loop

| Triggering Action | Contract Event Emitted | Listener Reaction | Socket.io Push Payload | UI Component Response |
| :--- | :--- | :--- | :--- | :--- |
| **Product Created** | `ProductRegistered` | Fetches DB record; logs to file | `PRODUCT_REGISTERED` | Creator gets success toast; bell highlights anchor status. |
| **Transfer Sent** | `TransferInitiated` | Matches pending DB transfer | `TRANSFER_PENDING_CONFIRMATION` | Receiver gets notification card in navbar with **"Confirm" button**. |
| **Transfer Accepted** | `TransferConfirmed` | Marks transfer complete | `TRANSFER_CONFIRMED` | Both parties receive confirmation alerts; UI timeline updates. |
| **Dispute Flagged** | `DisputeRaised` | Locks product status in DB | `DISPUTED` / `DISPUTE_RAISED` | Red counterfeit warnings appear on product card & Audit view. |

### Hybrid Architecture Decision Matrix

Our hybrid model optimizes performance and trust:

| Parameter | Off-Chain Database (MongoDB) | On-Chain Blockchain (Ethereum) |
| :--- | :--- | :--- |
| **Operation Speed** | ⚡ Sub-millisecond reads & writes | ⏳ Blocks take several seconds to mine |
| **Transaction Fees**| 💸 Free operational writes | ⛽ Gas fees incurred per state modification |
| **Decentralized Trust**| ❌ Managed by host database server | ✅ Cryptographically validated by network validators |
| **Query Flexibility**| ✅ Full-text index, compound filter, regex | ❌ Strict key-value mapping only |

---

## 🛠 Tech Stack Matrix

| Layer | Component | Technologies |
| :--- | :--- | :--- |
| **Frontend** | Application Core | React 18, Vite, React Router v6, Axios, Socket.io-Client |
| | Design & UX | CSS Custom Properties (Dark/Light themes), Glassmorphism, Skeleton loading |
| **Backend** | API Engine | Node.js, Express 4, Mongoose 7, Socket.io, Ethers.js v6 |
| | Synchronization | Background Daemon, File Logging (`event_listener.log`) |
| **Database** | Primary Store | MongoDB (Local Service / Atlas) |
| **Blockchain**| Smart Contracts | Solidity 0.8.20, Hardhat Development Environment |
| **Testing** | Suite | Jest, Supertest, MongoDB Memory Server, Hardhat Chai |

---

## 📁 Project Directory Structure

```
supply-chain/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express setup + route registration
│   │   ├── index.js                # Server entry, DB connection, & Socket init
│   │   ├── config/                 # db.js, blockchain.js (ethers configuration)
│   │   ├── controllers/            # auth, product, transfer, audit, sync, dispute
│   │   ├── middleware/             # auth.js, requireRole.js (RBAC)
│   │   ├── models/                 # User, Product, Transfer, DisputeReport
│   │   ├── routes/                 # health, auth, products, transfers, audit, sync, disputes
│   │   ├── sockets/                # notificationSocket.js (Socket.io event emission)
│   │   └── utils/                  # hash.js, jwt.js, chainAdapter.js, retrySync.js, eventListener.js
│   ├── tests/                      # Jest API integration tests
│   ├── .env.example                # Config template for backend
│   └── package.json
├── blockchain/
│   ├── contracts/
│   │   └── SupplyChainRegistry.sol # Multi-sig transfer & Dispute Solidity contract
│   ├── scripts/
│   │   └── deploy.js               # Compiler deployment script
│   ├── test/
│   │   └── SupplyChainRegistry.test.js # Hardhat contract test suite
│   ├── exported-abi.json           # Standalone contract ABI for backend Ethers
│   └── hardhat.config.js
├── frontend/
│   ├── src/
│   │   ├── api/                    # axios.js, authService, productService, transferService, disputeService
│   │   ├── context/                # AuthContext.jsx, NotificationContext.jsx
│   │   ├── components/             # Navbar, ProtectedRoute, ThemeToggle, Toast, NotificationBell, CopyableHash
│   │   ├── pages/                  # Login, Register, Dashboard, Products, Transfers, Audit, Sync
│   │   ├── App.jsx                 # Routing and layout setup
│   │   └── index.css               # Design system rules, variables, keyframes
│   ├── .env                        # Frontend configurations (VITE_API_URL)
│   └── vite.config.js              # Dev proxy rules
├── docs/
│   ├── architecture.md             # Mermaid diagrams for data flows
│   └── BlockTrace.postman_collection.json # Exported API testing collection
├── start-dev.sh                    # Automated service guide script
├── MANUAL_RUN_GUIDE.md             # Manual testing procedures
└── TESTING_GUIDE.md                # Automated test execution directions
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)
- MongoDB running locally on port `27017`

---

### Step-by-Step Setup

To simplify execution, you can run `bash start-dev.sh` to see guidance on launching the services, or follow the manual setup below:

#### 1. Compile & Deploy Smart Contracts
```bash
cd blockchain
npm install
npm run compile
npm test

# Terminal 1: Spin up local blockchain network
npm run node

# Terminal 2: Deploy to local network
npm run deploy:local
# Copy the deployed "SupplyChainRegistry" address from the output
```

#### 2. Configure & Start Backend
1. Create a `backend/.env` file:
   ```bash
   cd ../backend
   npm install
   cp .env.example .env
   ```
2. Open `backend/.env` and update the configurations:
   - `PORT=5000`
   - Set `CONTRACT_ADDRESS` to the deployed contract address from Step 1.
   - Set `DEPLOYER_PRIVATE_KEY` to the private key of Account #0 printed by `npm run node`.
3. Launch the server:
   ```bash
   npm start
   # Live logs: tail -f event_listener.log
   ```

#### 3. Configure & Start Frontend
1. Create a `frontend/.env` file:
   ```bash
   cd ../frontend
   npm install
   ```
2. Ensure `frontend/.env` contains the correct API URL:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
3. Run the development server:
   ```bash
   npm run dev
   # App will open at http://localhost:5173
   ```

---

### First-Time Walkthrough
1. **Register Users:** Create accounts at `http://localhost:5173/register` for a Manufacturer and a Distributor.
2. **Anchor Product:** Log in as the **Manufacturer** ➔ Navigate to **Products** ➔ Submit the creation form. A notification will announce when the item is anchored to the block.
3. **Initiate Transfer:** Go to **Transfers** ➔ Select the product ➔ Input the **Distributor's User ID** (copy from profile) ➔ Click **Send**.
4. **Confirm Transfer:** Log out and sign in as the **Distributor**. Look for the flashing indicator on the **Notification Bell** in the navbar ➔ Click **Confirm Transfer** directly inside the alert dropdown.
5. **View Audits:** Navigate to **Audit Trail** ➔ Search for the product's ID to view the full verified ownership history, database consistency validation, and on-chain hash matches.
6. **File Dispute:** As any user, submit a dispute report for a suspicious item. Log in as **Admin** ➔ Go to the **Dashboard** dispute list ➔ Click **Escalate to Chain** to execute `flagDispute()` and lock the asset.

---

## 🔐 Environmental Configuration

All backend parameters are managed via `backend/.env`:

| Key | Default | Required | Description |
| :--- | :--- | :---: | :--- |
| `PORT` | `5000` | No | Server listener port |
| `NODE_ENV` | `development` | No | Target runtime environment (`development` / `production`) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/supply-chain` | **Yes** | Database connection string |
| `JWT_SECRET` | — | **Yes** | Encryption key for securing auth tokens |
| `BLOCKCHAIN_RPC_URL` | `http://127.0.0.1:8545` | No | Local or remote EVM RPC node URL |
| `DEPLOYER_PRIVATE_KEY` | — | No | Key used by backend to execute write transactions |
| `CONTRACT_ADDRESS` | — | No | Target deployed smart contract address |
| `CHAIN_SYNC_INTERVAL_MS`| `60000` | No | Frequency of the background sync worker (ms) |
| `CHAIN_SYNC_MAX_RETRIES`| `5` | No | Failure threshold before marking sync as permanently failed |
| `CHAIN_SYNC_BATCH_SIZE` | `20` | No | Records processed per sync sweep |

---

## 📡 API Reference Blueprint

**Base URL:** `http://localhost:5000`  
**Headers:** `Authorization: Bearer <JWT_TOKEN>`

### 👤 Authentication & User Management

#### `POST /api/auth/register`
Creates a user account.
- **Body:**
  ```json
  {
    "email": "mfr@test.com",
    "password": "SecurePassword123!",
    "role": "manufacturer" // manufacturer | distributor | retailer | admin
  }
  ```

#### `POST /api/auth/login`
Validates credentials and returns a JWT.
- **Body:**
  ```json
  { "email": "mfr@test.com", "password": "SecurePassword123!" }
  ```
- **Response:**
  ```json
  { "success": true, "token": "ey...", "user": { "id": "...", "email": "...", "role": "..." } }
  ```

#### `GET /api/auth/me`
Retrieves information for the currently authenticated user.

#### `GET /api/auth/users` (Admin Only)
Lists all registered users.

#### `DELETE /api/auth/users/:id` (Admin Only)
Deletes a user account.

---

### 📦 Products & Search

#### `POST /api/products` (Manufacturer/Admin Only)
Registers a new product. Generates the off-chain `contentHash` and schedules on-chain anchoring.
- **Body:**
  ```json
  {
    "sku": "SKU-9988",
    "name": "Titanium Gear",
    "description": "High-durability manufacturing gear",
    "price": 25000.00
  }
  ```

#### `GET /api/products`
Lists all products.

#### `GET /api/products/:id`
Retrieves details for a specific product.

#### `GET /api/products/search`
Queries products with pagination, sorting, and filtering.
- **Query Parameters:**
  - `query` (string): Text match search for SKU, name, or description.
  - `page` (number): Current results page (default: `1`).
  - `limit` (number): Items per page (default: `10`).
  - `sort` (string): Sort direction (`asc` | `desc`).
  - `syncStatus` (string): Filter by db sync state (`pending` | `confirmed` | `failed`).
  - `chainStatus` (string): Filter by blockchain state (`CREATED` | `IN_TRANSIT` | `DELIVERED` | `DISPUTED`).

#### `GET /api/products/:id/status`
Checks the live database and blockchain sync status of a product.

---

### 🔄 Ownership Transfers

#### `POST /api/transfers` (Current Owner Only)
Initiates the 2-step multi-sig transfer process. Changes product status to `IN_TRANSIT`.
- **Body:**
  ```json
  { "productId": "mongoProductId123", "toUserId": "mongoReceiverId456" }
  ```

#### `POST /api/transfers/confirm` (Designated Receiver Only)
Accepts a pending transfer request. Updates ownership and marks state as `DELIVERED`.
- **Body:**
  ```json
  { "productId": "mongoProductId123" }
  ```

#### `GET /api/transfers/product/:productId`
Lists the complete ownership transfer history for a specific product.

---

### ⚠️ Dispute Resolution

#### `POST /api/disputes/report`
Fails a dispute report for a stolen or counterfeit item.
- **Body:**
  ```json
  {
    "productId": "mongoProductId123",
    "reason": "Counterfeit", // Counterfeit | Stolen
    "description": "Product packaging has non-matching seal."
  }
  ```

#### `GET /api/disputes/my`
Retrieves disputes filed by the authenticated user.

#### `GET /api/disputes` (Admin Only)
Lists all submitted dispute reports.

#### `POST /api/disputes/:id/flag` (Admin Only)
Escalates a dispute. Executes `flagDispute()` on-chain to freeze the product.

#### `POST /api/disputes/:id/reject` (Admin Only)
Dismisses a dispute report.

---

### 🔍 Verification & Audit

#### `GET /api/audit/:productId`
Returns a detailed validation report combining database records and on-chain blockchain values.
- **Key Response Fields:**
  - `dbFieldIntegrity` (`ok` | `mismatch`): Validates if the stored database hash matches a freshly computed hash of the product details.
  - `hashConsistency` (`match` | `mismatch` | `not_anchored`): Checks if the database hash matches the on-chain recorded hash.
  - `overallVerified` (`true` | `false`): Evaluates as true only when both checks pass.
  - `chainState` (object): Raw blockchain status: `ownerAddress`, `contentHashOnChain`, and `status` (`0=CREATED`, `1=IN_TRANSIT`, `2=DELIVERED`, `3=DISPUTED`).

#### `GET /api/audit/:productId/verify`
Lightweight verification response.

---

### 🔁 Sync Monitoring

#### `GET /api/sync/status`
Returns database sync counters (`pending`, `retryable`, `exhausted`).

#### `POST /api/sync/trigger` (Admin Only)
Manually triggers the background synchronization worker.

---

## 👥 Role-Based Access Control (RBAC)

BlockTrace enforces strict role permissions across all operations:

| Capability | Manufacturer | Distributor | Retailer | Platform Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Register & Login** | ✅ | ✅ | ✅ | ✅ |
| **Browse Products & Timeline** | ✅ | ✅ | ✅ | ✅ |
| **Create/Anchor Products** | ✅ | ❌ | ❌ | ✅ |
| **Initiate Transfer** | ✅ (if owner) | ✅ (if owner) | ✅ (if owner) | ✅ |
| **Confirm Transfer Receipt** | ✅ (if receiver)| ✅ (if receiver)| ✅ (if receiver)| ✅ |
| **File Dispute Report** | ✅ | ✅ | ✅ | ✅ |
| **Escalate Dispute On-Chain**| ❌ | ❌ | ❌ | ✅ |
| **Access User Admin Panel** | ❌ | ❌ | ❌ | ✅ |
| **Monitor/Trigger Sync Jobs** | ❌ | ❌ | ❌ | ✅ |

---

## 🧪 Automated Testing

Both smart contracts and backend services are fully tested to ensure stability:

```bash
# 1. Run smart contract unit tests (15+ cases verifying state changes and reverts)
cd blockchain
npm test

# 2. Run backend integration tests (using an in-memory Mongo server and mock Ethers configurations)
cd ../backend
npm test
```

---

## 📮 Postman Integration

To quickly test the APIs:
1. Import `docs/BlockTrace.postman_collection.json` into Postman.
2. Configure a collection environment variable: `baseUrl = http://localhost:5000`.
3. Execute the **Auth/Login** request. A post-request script will extract and store the JWT in a `{{token}}` variable.
4. Subsequent protected requests will automatically include the token.

---

## 🏁 17-Day Feature Development Roadmap

All development milestones have been successfully completed:

| Milestone Day | Subsystem Focus | Deliverables | Status |
| :---: | :--- | :--- | :---: |
| **Day 1** | System Setup & Spec | Monorepo layout, initial README, architecture blueprints. | ✅ |
| **Day 2** | Database Modeling | Mongoose schema design for users, products, and transactions. | ✅ |
| **Day 3** | Express Setup | Express listener, health check routes, and DB connector. | ✅ |
| **Day 4** | Secure Authentication | JWT creation, bcrypt hashing, and RBAC middleware guards. | ✅ |
| **Day 5** | Product Catalog API | Catalog creation, validation, and SHA-256 fingerprint generation. | ✅ |
| **Day 6** | Basic Transfer Logic | DB-level transaction updates and validation rules. | ✅ |
| **Day 7** | Smart Contract Design | Solidity interfaces, storage mappings, and tracking events. | ✅ |
| **Day 8** | Hardhat Local Setup | Contract compilation, local deployment script, and test suites. | ✅ |
| **Day 9** | Ethers.js Integration | Backend integration to execute transactions on-chain. | ✅ |
| **Day 10**| Verification Audits | Verification logic comparing DB states against blockchain hashes. | ✅ |
| **Day 11**| Sync Recovery Engine | Background retry workers to handle RPC nodes downtime. | ✅ |
| **Day 12**| Test Suite Expansion | Full Jest integration tests and expanded contract tests. | ✅ |
| **Day 13**| Client Setup | React SPA routing, Protected routes, and AuthContext. | ✅ |
| **Day 14**| Core Operations UI | Dashboard, Product creation, and initial Transfer timeline. | ✅ |
| **Day 15**| Advanced Views | Audit reports page, Sync control tables, and responsiveness. | ✅ |
| **Day 16**| Documentation Polish | Startup scripts, architecture updates, and Postman collections. | ✅ |
| **Day 17**| Advanced Search & Engine | Compound text index search, pagination, and status filters. | ✅ |

---
*BlockTrace — Built for absolute trust and transparency in supply chain networks.*
