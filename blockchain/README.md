# Smart contracts

## Design 

- **`contracts/SupplyChainRegistry.sol`** — `Product` struct, `mapping(bytes32 => Product)`, events `ProductRegistered` and `OwnershipTransferred`, and `registerProduct` / `transferOwnership` / `getProduct`.

`productId` and `contentHash` are `bytes32` so the backend can pass values derived consistently (for example `keccak256` of a stable id string for `productId`, and a 32-byte content hash).

## Hardhat 

From this folder:

```bash
npm install
npm run compile
npm test
```

**Deploy to a local Hardhat node** (two terminals):

Terminal A — start the chain:

```bash
npm run node
```

Terminal B — deploy:

```bash
npm run deploy:local
```

### Layout

- `contracts/` — Solidity sources
- `hardhat.config.js` — Solidity 0.8.20
- `scripts/deploy.js` — deploy `SupplyChainRegistry`
- `test/` — Hardhat tests
