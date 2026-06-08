const mongoose = require("mongoose");
const { Product, Transfer, User } = require("../models");
const { supportsTransactions } = require("../config/db");
const { transferOwnershipOnChain, confirmTransferOnChain } = require("../utils/chainAdapter");

async function createTransfer(req, res) {
  const { productId, toUserId } = req.body || {};

  if (!productId || !toUserId) {
    return res.status(400).json({
      success: false,
      message: "productId and toUserId are required",
    });
  }

  let toUser;
  if (mongoose.isValidObjectId(toUserId)) {
    toUser = await User.findById(toUserId);
  } else if (typeof toUserId === "string" && toUserId.includes("@")) {
    toUser = await User.findOne({ email: toUserId.toLowerCase().trim() });
  } else {
    return res.status(400).json({
      success: false,
      message: "toUserId must be a valid user id (24-char hex) or an email",
    });
  }

  if (!toUser) {
    return res.status(404).json({
      success: false,
      message: "Target user not found",
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const currentOwnerId = product.owner.toString();
  const actorId = req.user.id;

  if (currentOwnerId !== actorId) {
    return res.status(403).json({
      success: false,
      message: "Only current owner can transfer this product",
    });
  }

  if (actorId === toUser._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "Cannot transfer product to current owner",
    });
  }

  // Prefer transactions when supported; otherwise use an atomic owner-check update
  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      let createdTransfer;

      await session.withTransaction(async () => {
        createdTransfer = await Transfer.create(
          [
            {
              product: product._id,
              fromUser: actorId,
              toUser: toUser._id,
            },
          ],
          { session },
        );

        product.owner = toUser._id;
        await product.save({ session });
      });

      const transfer = createdTransfer[0];
      const updatedProduct = await Product.findById(product._id)
        .populate("owner", "email role")
        .populate("createdBy", "email role");

      const txHash = await transferOwnershipOnChain(product, toUser._id);

      let syncStatus;
      if (txHash) {
        transfer.blockchainTxHash = txHash;
        transfer.syncStatus = "confirmed";
        syncStatus = "confirmed";
      } else {
        transfer.syncStatus = "failed";
        syncStatus = "failed";
      }
      await transfer.save();

      return res.status(201).json({
        success: true,
        message: "Ownership transferred successfully",
        transfer,
        product: updatedProduct,
        blockchainSyncStatus: syncStatus,
      });
    } finally {
      await session.endSession();
    }
  }

  // Fallback for standalone MongoDB: do an atomic owner-check & update, then create transfer
  // This avoids transactions while still preventing a simple race on owner field.
  const updatedProduct = await Product.findOneAndUpdate(
    { _id: product._id, owner: actorId },
    { owner: toUser._id },
    { new: true },
  );

  if (!updatedProduct) {
    return res.status(403).json({
      success: false,
      message: "Only current owner can transfer this product",
    });
  }

  const transfer = await Transfer.create({
    product: product._id,
    fromUser: actorId,
    toUser: toUser._id,
  });

  const txHash = await transferOwnershipOnChain(updatedProduct, toUser._id);
  let syncStatus;
  if (txHash) {
    transfer.blockchainTxHash = txHash;
    transfer.syncStatus = "confirmed";
    syncStatus = "confirmed";
  } else {
    transfer.syncStatus = "failed";
    syncStatus = "failed";
  }
  await transfer.save();

  const populatedProduct = await Product.findById(product._id)
    .populate("owner", "email role")
    .populate("createdBy", "email role");

  return res.status(201).json({
    success: true,
    message: "Ownership transferred successfully",
    transfer,
    product: populatedProduct,
    blockchainSyncStatus: syncStatus,
  });
}

async function listTransfersByProduct(req, res) {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const transfers = await Transfer.find({ product: productId })
    .populate("fromUser", "email role")
    .populate("toUser", "email role")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: transfers.length,
    transfers,
  });
}

// ─── Day 2 (P2): Confirm multi-sig transfer ────────────────────────────────────

/**
 * POST /api/transfers/confirm
 * Body: { transferId }
 * Auth: JWT — only the intended receiver (toUser) can call this.
 *
 * Confirms an on-chain pending transfer that was previously initiated by the
 * sender. Updates DB: sets syncStatus = 'confirmed', blockchainTxHash,
 * and product.owner = toUser.
 */
async function confirmTransfer(req, res) {
  const { transferId } = req.body || {};

  if (!transferId) {
    return res.status(400).json({
      success: false,
      message: "transferId is required",
    });
  }

  const transfer = await Transfer.findById(transferId).populate("product");
  if (!transfer) {
    return res.status(404).json({
      success: false,
      message: "Transfer not found",
    });
  }

  // Only the intended receiver can confirm
  if (transfer.toUser.toString() !== req.user.id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Only the intended receiver can confirm this transfer",
    });
  }

  // Guard: already confirmed by receiver (independent of blockchain syncStatus)
  if (transfer.receiverConfirmed) {
    return res.status(409).json({
      success: false,
      message: "Transfer is already confirmed",
    });
  }

  // Attempt on-chain confirmation (graceful: null if chain unavailable)
  const txHash = await confirmTransferOnChain(transfer.product);

  transfer.syncStatus = txHash ? "confirmed" : "failed";
  transfer.receiverConfirmed = true;
  if (txHash) transfer.blockchainTxHash = txHash;
  await transfer.save();

  // Update product owner in DB
  const product = await Product.findById(transfer.product._id);
  if (product) {
    product.owner = transfer.toUser;
    await product.save();
  }

  return res.json({
    success: true,
    message: txHash
      ? "Transfer confirmed on-chain and in DB"
      : "Transfer confirmed in DB (chain unavailable — will retry)",
    transfer,
    blockchainSyncStatus: transfer.syncStatus,
    blockchainTxHash: txHash || null,
  });
}

module.exports = {
  createTransfer,
  listTransfersByProduct,
  confirmTransfer,
};
