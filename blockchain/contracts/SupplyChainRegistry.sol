// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChainRegistry
 * @notice Day 7 design (original): on-chain anchor for product integrity hash + ownership.
 *         Day 1 (P2) upgrade: ProductStatus enum, multi-sig transfer (initiateTransfer +
 *         confirmTransfer), dispute flagging. Original registerProduct / transferOwnership /
 *         getProduct signatures are PRESERVED so existing backend calls continue to work.
 */
contract SupplyChainRegistry {

    // ─── Status enum ─────────────────────────────────────────────────────────

    enum ProductStatus {
        CREATED,     // just registered by manufacturer
        IN_TRANSIT,  // ownership transfer initiated, pending receiver confirmation
        DELIVERED,   // transfer confirmed by receiver
        DISPUTED     // flagged by admin
    }

    // ─── Structs ─────────────────────────────────────────────────────────────

    struct Product {
        bytes32 contentHash;
        address owner;
        address registrar;
        ProductStatus status;      // NEW
        uint256 registeredAt;
        uint256 lastUpdatedAt;     // NEW
        bool exists;
    }

    struct PendingTransfer {
        address from;
        address to;
        uint256 initiatedAt;
        bool exists;
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    mapping(bytes32 => Product) private _products;
    mapping(bytes32 => PendingTransfer) public pendingTransfers;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @dev Original events — kept intact so backend listeners continue to work.
    event ProductRegistered(
        bytes32 indexed productId,
        bytes32 indexed contentHash,
        address indexed owner,
        uint256 timestamp
    );

    event OwnershipTransferred(
        bytes32 indexed productId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    /// @dev New events for multi-sig transfer and dispute.
    event TransferInitiated(
        bytes32 indexed productId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event TransferConfirmed(
        bytes32 indexed productId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event DisputeRaised(
        bytes32 indexed productId,
        address indexed flaggedBy,
        uint256 timestamp
    );

    // ─── Original functions (signatures unchanged) ───────────────────────────

    /**
     * @notice Register a product and anchor its SHA-256 content hash on-chain.
     *         Called by the backend after the DB insert (Day 9 integration).
     */
    function registerProduct(bytes32 productId, bytes32 contentHash) external {
        require(productId != bytes32(0), "invalid product id");
        require(contentHash != bytes32(0), "invalid content hash");
        require(!_products[productId].exists, "already registered");

        _products[productId] = Product({
            contentHash: contentHash,
            owner: msg.sender,
            registrar: msg.sender,
            status: ProductStatus.CREATED,
            registeredAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            exists: true
        });

        emit ProductRegistered(productId, contentHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Immediate (single-party) ownership transfer — kept for backward
     *         compatibility with the Day-9 backend integration.
     */
    function transferOwnership(bytes32 productId, address newOwner) external {
        require(newOwner != address(0), "invalid new owner");

        Product storage p = _products[productId];
        require(p.exists, "unknown product");
        require(p.owner == msg.sender || p.registrar == msg.sender, "not owner");
        require(newOwner != p.owner, "same owner");

        address from = p.owner;
        p.owner = newOwner;
        p.status = ProductStatus.DELIVERED;
        p.lastUpdatedAt = block.timestamp;

        emit OwnershipTransferred(productId, from, newOwner, block.timestamp);
    }

    /**
     * @notice Returns core product data.  Signature extended to include status
     *         and lastUpdatedAt — callers that only destructure the first three
     *         return values continue to work unchanged.
     */
    function getProduct(bytes32 productId)
        external
        view
        returns (
            bytes32 contentHash,
            address owner,
            uint256 registeredAt,
            uint8  status,         // 0=CREATED 1=IN_TRANSIT 2=DELIVERED 3=DISPUTED
            uint256 lastUpdatedAt
        )
    {
        Product storage p = _products[productId];
        require(p.exists, "unknown product");
        return (
            p.contentHash,
            p.owner,
            p.registeredAt,
            uint8(p.status),
            p.lastUpdatedAt
        );
    }

    // ─── NEW: Multi-sig transfer ──────────────────────────────────────────────

    /**
     * @notice Step 1 — current owner initiates a transfer request.
     *         Product status moves to IN_TRANSIT.
     */
    function initiateTransfer(bytes32 productId, address newOwner) external {
        require(newOwner != address(0), "invalid new owner");
        Product storage p = _products[productId];
        require(p.exists, "unknown product");
        require(p.owner == msg.sender || p.registrar == msg.sender, "not owner");
        require(newOwner != p.owner, "same owner");
        require(!pendingTransfers[productId].exists, "transfer already pending");

        pendingTransfers[productId] = PendingTransfer({
            from: msg.sender,
            to: newOwner,
            initiatedAt: block.timestamp,
            exists: true
        });

        p.status = ProductStatus.IN_TRANSIT;
        p.lastUpdatedAt = block.timestamp;

        emit TransferInitiated(productId, msg.sender, newOwner, block.timestamp);
    }

    /**
     * @notice Step 2 — intended receiver confirms and takes ownership.
     *         Product status moves to DELIVERED.
     */
    function confirmTransfer(bytes32 productId) external {
        PendingTransfer memory pt = pendingTransfers[productId];
        require(pt.exists, "no pending transfer");

        Product storage p = _products[productId];
        require(
            pt.to == msg.sender || p.registrar == msg.sender,
            "not the intended receiver"
        );
        address from = p.owner;
        p.owner = pt.to;
        p.status = ProductStatus.DELIVERED;
        p.lastUpdatedAt = block.timestamp;

        delete pendingTransfers[productId];

        emit TransferConfirmed(productId, from, pt.to, block.timestamp);
    }

    // ─── NEW: Dispute flagging ────────────────────────────────────────────────

    /**
     * @notice Flag a product as DISPUTED (anyone can call for now;
     *         add access control in production).
     */
    function flagDispute(bytes32 productId) external {
        Product storage p = _products[productId];
        require(p.exists, "unknown product");

        p.status = ProductStatus.DISPUTED;
        p.lastUpdatedAt = block.timestamp;

        emit DisputeRaised(productId, msg.sender, block.timestamp);
    }

    // ─── NEW: Pending transfer getter ────────────────────────────────────────

    function getPendingTransfer(bytes32 productId)
        external
        view
        returns (address from, address to, uint256 initiatedAt, bool exists)
    {
        PendingTransfer storage pt = pendingTransfers[productId];
        return (pt.from, pt.to, pt.initiatedAt, pt.exists);
    }
}
