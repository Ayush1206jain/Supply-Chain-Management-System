# BlockTrace — Blockchain Supply Chain Management System

**A production-ready supply chain transparency platform combining blockchain immutability with database performance, featuring multi-signature ownership transfers and zero-knowledge price range proofs.**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Role Permissions](#-role-permissions)
- [Running Tests](#-running-tests)
- [Postman Collection](#-postman-collection)
- [16-Day Roadmap](#-16-day-roadmap)

---

## 🌐 Overview

BlockTrace solves the trust problem in supply chains. Any party can verify a product's provenance and ownership history without relying on a single central authority — because critical facts live on an immutable Ethereum smart contract.

**Key capabilities:**

- 🔐 JWT auth with four roles: Manufacturer, Distributor, Retailer, Admin
- 📦 Product registration with SHA-256 content fingerprint
- 🔄 Ownership transfers with full chronological history
- ⛓ On-chain anchoring via `SupplyChainRegistry.sol` (Hardhat / Ethers.js)
- 🔍 Audit API — cross-checks DB data with live on-chain state
- 🔁 Background retry job for failed blockchain syncs
- 🖥 React frontend (Vite) — Dashboard, Products, Transfers, Audit Trail, Sync Panel

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│   Manufacturer  │  Distributor  │  Retailer  │  Admin         │
│             React SPA (Vite + React Router v6)               │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP / REST  (Axios + JWT Bearer)
┌──────────────────────────▼───────────────────────────────────┐
│                    Backend API (Express)                      │
│  Auth (JWT+roles) │ Products │ Transfers │ Audit │ Sync       │
└───────────┬──────────────────────────────┬───────────────────┘
            │                              │
┌───────────▼──────────┐   ┌──────────────▼─────────────────┐  │
│  MongoDB (Mongoose)  │   │  Ethereum (Hardhat/Ethers.js)   │  │
│  Users, Products,    │   │  SupplyChainRegistry.sol        │  │
│  Transfers           │   │  registerProduct()              │  │
│  syncStatus field    │   │  transferOwnership()            │  │
└──────────────────────┘   └─────────────────────────────────┘
```

### Data Flow

| Step | Action             | Off-chain (DB)                           | On-chain                             |
| ---- | ------------------ | ---------------------------------------- | ------------------------------------ |
| 1    | Register / Login   | JWT issued, role stored                  | —                                    |
| 2    | Create product     | Product + SHA-256 hash saved             | `registerProduct(id, hash)`          |
| 3    | Transfer ownership | Transfer doc + owner updated             | `transferOwnership(id, newOwner)`    |
| 4    | Audit lookup       | DB snapshot fetched                      | `getProduct()` view; hashes compared |
| 5    | Sync retry         | Background job picks up `failed` records | Re-submits chain calls ≤ MAX_RETRIES |

### Design Decision

| Concern      | Off-chain (MongoDB)      | On-chain (Ethereum)  |
| ------------ | ------------------------ | -------------------- |
| Speed        | ✅ Fast                  | ❌ Slow (block time) |
| Cost         | ✅ Free                  | ❌ Gas fees          |
| Trust        | ❌ Single server         | ✅ Decentralised     |
| Rich queries | ✅ Full text, pagination | ❌ Limited           |

**Hybrid:** MongoDB handles operational data; blockchain provides a tamper-evident anchor.

---

## 🛠 Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 18, Vite, React Router v6, Axios          |
| Backend    | Node.js, Express 4, Mongoose 7                  |
| Database   | MongoDB                                         |
| Blockchain | Hardhat, Solidity 0.8.20, Ethers.js v6          |
| Auth       | JSON Web Tokens (JWT), bcrypt                   |
| Testing    | Jest, Supertest, mongodb-memory-server, Hardhat |
| Styling    | Vanilla CSS (dark + light theme, CSS variables) |

---

## 📁 Project Structure

```
supply-chain/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express + route mounting
│   │   ├── index.js                # Server entry point
│   │   ├── config/                 # db.js, blockchain.js
│   │   ├── controllers/            # auth, product, transfer, audit, sync
│   │   ├── middleware/             # auth.js, requireRole.js
│   │   ├── models/                 # User, Product, Transfer
│   │   ├── routes/                 # health, auth, products, transfers, audit, sync
│   │   ├── utils/                  # hash.js, jwt.js, chainAdapter.js, retrySync.js
│   │   └── jobs/                   # startRetryJob.js
│   ├── tests/                      # auth, products, transfers, audit, sync tests
│   ├── .env.example
│   └── package.json
├── blockchain/
│   ├── contracts/SupplyChainRegistry.sol
│   ├── scripts/deploy.js
│   ├── test/SupplyChainRegistry.test.js
│   ├── exported-abi.json
│   └── hardhat.config.js
├── frontend/
│   ├── src/
│   │   ├── api/                    # axios.js + service files
│   │   ├── context/AuthContext.jsx
│   │   ├── components/             # Navbar, ProtectedRoute, ThemeToggle
│   │   ├── pages/                  # Login, Dashboard, Products, Transfers, Audit, Sync
│   │   ├── App.jsx
│   │   └── index.css               # Global design system
│   └── vite.config.js              # Dev proxy → backend :3000
├── docs/
│   ├── architecture.md
│   └── BlockTrace.postman_collection.json
├── daily_progress/
│   ├── what-i-did.md
│   └── interview-questions.md
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool    | Version                  |
| ------- | ------------------------ |
| Node.js | ≥ 18                     |
| npm     | ≥ 9                      |
| MongoDB | ≥ 6 (local) or Atlas URI |
| Git     | any                      |

> Blockchain is **optional** — the backend runs in DB-only mode if blockchain env vars are absent.

---

### 1 · Backend Setup

```bash
cd backend
npm install
cp .env.example .env        # edit with your values
npm start                   # → http://localhost:3000
curl http://localhost:3000/health
```

---

### 2 · Blockchain Setup _(optional)_

```bash
cd blockchain
npm install
npm run compile             # compile Solidity
npm test                    # run 15 contract tests

# Terminal 1 — start local node
npm run node                # prints Account #0 + private key

# Terminal 2 — deploy
npm run deploy:local        # prints contract address

# Copy into backend/.env:
#   BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
#   DEPLOYER_PRIVATE_KEY=<Account #0 key>
#   CONTRACT_ADDRESS=<address from deploy>
# Then restart: cd ../backend && npm start
```

---

### 3 · Frontend Setup

```bash
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

> `vite.config.js` proxies `/api/*` → `http://localhost:3000` — no CORS issues in dev.

#### First-time walkthrough

1. Open **http://localhost:5173** → click **Register**
2. Create accounts: `manufacturer@test.com` (role: manufacturer), `admin@test.com` (role: admin)
3. Log in as **manufacturer** → **Products** → create a product
4. Log in as **admin** → **Transfers** → transfer to the manufacturer's ID
5. **Audit** → paste the Product ID → view blockchain integrity verdict
6. **Sync** (admin) → view counters + trigger manual retry

---

## 🔐 Environment Variables

All vars live in `backend/.env` (copy from `backend/.env.example`).

| Variable                 | Default                                  | Required | Description                                       |
| ------------------------ | ---------------------------------------- | :------: | ------------------------------------------------- |
| `PORT`                   | `3000`                                   |    No    | Express port                                      |
| `NODE_ENV`               | `development`                            |    No    | `development` / `production`                      |
| `MONGODB_URI`            | `mongodb://127.0.0.1:27017/supply-chain` | **Yes**  | MongoDB connection string                         |
| `JWT_SECRET`             | —                                        | **Yes**  | Long random string for JWT signing                |
| `BLOCKCHAIN_RPC_URL`     | —                                        |    No    | RPC endpoint (Hardhat: `http://127.0.0.1:8545`)   |
| `DEPLOYER_PRIVATE_KEY`   | —                                        |    No    | Deployer wallet key — **never commit a real key** |
| `CONTRACT_ADDRESS`       | —                                        |    No    | Deployed `SupplyChainRegistry` address            |
| `CHAIN_SYNC_INTERVAL_MS` | `60000`                                  |    No    | Background retry interval (ms)                    |
| `CHAIN_SYNC_MAX_RETRIES` | `5`                                      |    No    | Max attempts before permanent failure             |
| `CHAIN_SYNC_BATCH_SIZE`  | `20`                                     |    No    | Records per retry pass                            |

---

## 📡 API Reference

**Base URL:** `http://localhost:3000`  
**Auth header:** `Authorization: Bearer <token>`

### Auth

| Method | Endpoint             | Auth | Body                        | Description       |
| ------ | -------------------- | :--: | --------------------------- | ----------------- |
| POST   | `/api/auth/register` |  —   | `{ email, password, role }` | Create account    |
| POST   | `/api/auth/login`    |  —   | `{ email, password }`       | Returns JWT       |
| GET    | `/api/auth/me`       |  ✅  | —                           | Current user info |

### Products

| Method | Endpoint            |         Auth          | Description                     |
| ------ | ------------------- | :-------------------: | ------------------------------- |
| GET    | `/api/products`     |        ✅ Any         | List all products               |
| GET    | `/api/products/:id` |        ✅ Any         | Get product by ID               |
| POST   | `/api/products`     | ✅ manufacturer/admin | Create + hash + anchor on-chain |

**POST `/api/products` body:**

```json
{
  "sku": "SKU-001",
  "name": "Product Name",
  "description": "...",
  "price": 499.99
}
```

### Transfers

| Method | Endpoint                            |        Auth        | Description        |
| ------ | ----------------------------------- | :----------------: | ------------------ |
| POST   | `/api/transfers`                    | ✅ (current owner) | Transfer ownership |
| GET    | `/api/transfers/product/:productId` |       ✅ Any       | Ownership history  |

**POST `/api/transfers` body:**

```json
{ "productId": "<mongoId>", "toUserId": "<mongoId>" }
```

### Audit

| Method | Endpoint                       |  Auth  | Description                                                |
| ------ | ------------------------------ | :----: | ---------------------------------------------------------- |
| GET    | `/api/audit/:productId`        | ✅ Any | Full report: product + transfers + chain state + integrity |
| GET    | `/api/audit/:productId/verify` | ✅ Any | `{ verified: bool, summary }`                              |

### Sync

| Method | Endpoint                        |   Auth   | Description                             |
| ------ | ------------------------------- | :------: | --------------------------------------- |
| GET    | `/api/sync/status`              |  ✅ Any  | Counts: pending / retryable / exhausted |
| POST   | `/api/sync/trigger`             | ✅ admin | Manual retry pass                       |
| GET    | `/api/sync/failed-transfers`    | ✅ admin | Paginated failed transfers              |
| GET    | `/api/sync/unanchored-products` | ✅ admin | Paginated unanchored products           |

### Health

| Method | Endpoint  | Description                  |
| ------ | --------- | ---------------------------- |
| GET    | `/health` | Uptime + DB status (no auth) |

---

## 👥 Role Permissions

| Action                      | Manufacturer  |  Distributor  |   Retailer    | Admin |
| --------------------------- | :-----------: | :-----------: | :-----------: | :---: |
| Register / Login            |      ✅       |      ✅       |      ✅       |  ✅   |
| View products & transfers   |      ✅       |      ✅       |      ✅       |  ✅   |
| Create product              |      ✅       |      ❌       |      ❌       |  ✅   |
| Transfer ownership          | ✅ (if owner) | ✅ (if owner) | ✅ (if owner) |  ✅   |
| Audit & verify              |      ✅       |      ✅       |      ✅       |  ✅   |
| View sync counters          |      ✅       |      ✅       |      ✅       |  ✅   |
| Trigger sync / admin tables |      ❌       |      ❌       |      ❌       |  ✅   |

---

## 🧪 Running Tests

```bash
# Backend (Jest + Supertest + in-memory MongoDB)
cd backend && npm test

# Smart contracts (Hardhat — 15 test cases)
cd blockchain && npm test
```

---

## 📮 Postman Collection

Import **`docs/BlockTrace.postman_collection.json`** into Postman.

1. Set environment variable: `baseUrl = http://localhost:3000`
2. Run **Register** → **Login** (the Login request auto-saves `{{token}}` via a test script)
3. All protected requests use `{{token}}` automatically

---
