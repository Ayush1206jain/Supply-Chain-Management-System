const mongoose = require("mongoose");
const { Product, Transfer, User } = require("../models");
const { supportsTransactions } = require("../config/db");
const { initiateTransferOnChain, confirmTransferOnChain } = require("../utils/chainAdapter");

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

  const pendingTransfer = await Transfer.findOne({
    product: product._id,
    receiverConfirmed: false,
  });

  if (pendingTransfer) {
    return res.status(409).json({
      success: false,
      message: "This product already has a pending transfer",
    });
  }

  // Prefer transactions when supported; otherwise create the transfer with an
  // owner-check immediately before insert. Product ownership moves on confirm.
  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      let createdTransfer;

      await session.withTransaction(async () => {
        const latestProduct = await Product.findOne({
          _id: product._id,
          owner: actorId,
        }).session(session);

        if (!latestProduct) {
          throw new Error("OWNER_CHANGED");
        }

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
      });

      const transfer = createdTransfer[0];
      const updatedProduct = await Product.findById(product._id)
        .populate("owner", "email role")
        .populate("createdBy", "email role");

      const txHash = await initiateTransferOnChain(product, toUser._id);

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
        message: "Transfer initiated. Waiting for recipient confirmation.",
        transfer,
        product: updatedProduct,
        blockchainSyncStatus: syncStatus,
      });
    } catch (err) {
      if (err.message === "OWNER_CHANGED") {
        return res.status(403).json({
          success: false,
          message: "Only current owner can transfer this product",
        });
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  const ownedProduct = await Product.findOne({ _id: product._id, owner: actorId });
  if (!ownedProduct) {
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

  const txHash = await initiateTransferOnChain(ownedProduct, toUser._id);
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
    message: "Transfer initiated. Waiting for recipient confirmation.",
    transfer,
    product: populatedProduct,
    blockchainSyncStatus: syncStatus,
  });
}

async function listTransfers(req, res) {
  const filter = {};

  if (req.query.toUserId === "me") {
    filter.toUser = req.user.id;
  } else if (req.query.toUserId && mongoose.isValidObjectId(req.query.toUserId)) {
    filter.toUser = req.query.toUserId;
  }

  if (req.query.fromUserId === "me") {
    filter.fromUser = req.user.id;
  } else if (req.query.fromUserId && mongoose.isValidObjectId(req.query.fromUserId)) {
    filter.fromUser = req.query.fromUserId;
  }

  if (req.query.receiverConfirmed !== undefined) {
    filter.receiverConfirmed = req.query.receiverConfirmed === "true";
  }

  if (req.query.syncStatus) {
    filter.syncStatus = req.query.syncStatus;
  }

  const transfers = await Transfer.find(filter)
    .populate("product", "sku name owner")
    .populate("fromUser", "email role name")
    .populate("toUser", "email role name")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: transfers.length,
    transfers,
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
    .populate("fromUser", "name email role")
    .populate("toUser", "name email role")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: transfers.length,
    transfers,
  });
}

// Confirm multi-sig transfer ────────────────────────────────────

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
  listTransfers,
  listTransfersByProduct,
  confirmTransfer,
};
