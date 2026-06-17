const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Current custodian of the product record (ownership in the app sense). */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** User who created the product (often the manufacturer). */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** SHA-256 (or similar) over canonical product fields — used for integrity / audit. */
    contentHash: {
      type: String,
      required: true,
    },
    /** Filled when a tx is sent on-chain . */
    blockchainTxHash: {
      type: String,
      default: null,
    },
    /** Number of on-chain registration attempts (. */
    retryCount: {
      type: Number,
      default: 0,
    },
    syncStatus: {
      type: String,
      enum: ["pending", "confirmed", "failed", "exhausted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Indexes for status and owner filtering (Day 1 plan)
productSchema.index({ syncStatus: 1 });
productSchema.index({ owner: 1 });
productSchema.index({ owner: 1, createdAt: -1 });
productSchema.index({ owner: 1, syncStatus: 1, createdAt: -1 });

// Text index for full-text search across name, description, and SKU
productSchema.index({ name: "text", description: "text", sku: "text" });

module.exports = mongoose.model("Product", productSchema);
