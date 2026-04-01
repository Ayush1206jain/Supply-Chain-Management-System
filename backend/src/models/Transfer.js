const mongoose = require("mongoose");

const SYNC_STATUS = Object.freeze(["pending", "confirmed", "failed"]);

const transferSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blockchainTxHash: {
      type: String,
      default: null,
    },
    /** Aligns with Day 11 (retries / sync). */
    syncStatus: {
      type: String,
      enum: [...SYNC_STATUS],
      default: "pending",
    },
    /** Number of chain-sync attempts made . Capped at MAX_RETRIES. */
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

transferSchema.index({ product: 1, createdAt: -1 });

transferSchema.pre("validate", function (next) {
  if (
    this.fromUser &&
    this.toUser &&
    this.fromUser.toString() === this.toUser.toString()
  ) {
    next(new Error("fromUser and toUser must be different"));
    return;
  }
  next();
});

module.exports = mongoose.model("Transfer", transferSchema);
module.exports.SYNC_STATUS = SYNC_STATUS;
