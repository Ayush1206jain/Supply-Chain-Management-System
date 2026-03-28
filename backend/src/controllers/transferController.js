const mongoose = require("mongoose");
const { Product, Transfer, User } = require("../models");

async function createTransfer(req, res) {
  const { productId, toUserId } = req.body || {};

  if (!productId || !toUserId) {
    return res.status(400).json({
      success: false,
      message: "productId and toUserId are required",
    });
  }

  const toUser = await User.findById(toUserId);
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
        { session }
      );

      product.owner = toUser._id;
      await product.save({ session });
    });

    const transfer = createdTransfer[0];
    const updatedProduct = await Product.findById(product._id)
      .populate("owner", "email role")
      .populate("createdBy", "email role");

    return res.status(201).json({
      success: true,
      message: "Ownership transferred successfully",
      transfer,
      product: updatedProduct,
    });
  } finally {
    await session.endSession();
  }
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

module.exports = {
  createTransfer,
  listTransfersByProduct,
};

