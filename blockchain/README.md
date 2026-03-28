# Smart contracts (Days 7–9)

## Day 7 (design)

- **`contracts/SupplyChainRegistry.sol`** — structs (`Product`), mappings (`bytes32 => Product`), events (`ProductRegistered`, `OwnershipTransferred`), and minimal `registerProduct` / `transferOwnership` / `getProduct` for the next step.

`productId` and `contentHash` are `bytes32` so the backend can pass values derived consistently (e.g. keccak256 of a stable id string for `productId`, hex content hash for `contentHash`).

## Day 8+ (implementation)

Hardhat project will be added here: compile, deploy locally, tests.

Planned layout:

- `contracts/` — registry (done for Day 7 design)
- `scripts/` — deploy and helpers
- `test/` — contract tests
