// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChainRegistry
 * @notice Day 7 design: on-chain anchor for product integrity hash + ownership.
 *         `productId` should match what the backend derives (e.g. keccak256 of stable id / SKU string).
 *         Day 8: Hardhat project, compile, deploy, tests.
 */
contract SupplyChainRegistry {
    struct Product {
        bytes32 contentHash;
        address owner;
        uint256 registeredAt;
        bool exists;
    }

    /// @dev Primary lookup: product id → record
    mapping(bytes32 => Product) private _products;

    /// @dev Emitted when a product is registered on-chain (hash anchored).
    event ProductRegistered(
        bytes32 indexed productId,
        bytes32 indexed contentHash,
        address indexed owner,
        uint256 timestamp
    );

    /// @dev Emitted on each ownership change (provenance trail for indexers / backend sync).
    event OwnershipTransferred(
        bytes32 indexed productId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    function registerProduct(bytes32 productId, bytes32 contentHash) external {
        require(productId != bytes32(0), "invalid product id");
        require(contentHash != bytes32(0), "invalid content hash");
        require(!_products[productId].exists, "already registered");

        _products[productId] = Product({
            contentHash: contentHash,
            owner: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });

        emit ProductRegistered(productId, contentHash, msg.sender, block.timestamp);
    }

    function transferOwnership(bytes32 productId, address newOwner) external {
        require(newOwner != address(0), "invalid new owner");

        Product storage p = _products[productId];
        require(p.exists, "unknown product");
        require(p.owner == msg.sender, "not owner");
        require(newOwner != p.owner, "same owner");

        address from = p.owner;
        p.owner = newOwner;

        emit OwnershipTransferred(productId, from, newOwner, block.timestamp);
    }

    function getProduct(
        bytes32 productId
    ) external view returns (bytes32 contentHash, address owner, uint256 registeredAt) {
        Product storage p = _products[productId];
        require(p.exists, "unknown product");
        return (p.contentHash, p.owner, p.registeredAt);
    }
}
