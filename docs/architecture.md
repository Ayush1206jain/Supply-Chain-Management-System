# Architecture

## High-level view

```mermaid
flowchart LR
  subgraph clients [Clients]
    M[Manufacturer]
    D[Distributor]
    R[Retailer]
    A[Admin]
  end

  subgraph api [Backend API]
    E[Express]
    Auth[JWT + roles]
    Svc[Product / Transfer / Audit]
  end

  subgraph data [Persistence]
    DB[(Database)]
  end

  subgraph chain [Blockchain]
    SC[Smart contract]
  end

  clients --> E
  E --> Auth
  E --> Svc
  Svc --> DB
  Svc --> SC
```

## Data flow (target state)

1. **Authentication** — Users register/login; JWT encodes role (manufacturer, distributor, retailer, admin).
2. **Products** — Create product in DB with content hash; optionally anchor on-chain and store transaction hash.
3. **Transfers** — Validate current owner, update ownership in DB, record transfer history; mirror critical steps on-chain.
4. **Audit** — Merge DB records with on-chain events and re-verify hashes.

## Role responsibilities (conceptual)

| Role          | Typical actions                          |
|---------------|------------------------------------------|
| Manufacturer  | Create/register products                 |
| Distributor   | Receive and forward ownership            |
| Retailer      | Final leg to consumer-facing inventory   |
| Admin         | Oversight, configuration (as designed)   |


