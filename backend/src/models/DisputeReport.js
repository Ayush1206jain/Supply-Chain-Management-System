const mongoose = require("mongoose");

/**
 * DisputeReport — created by a receiver (distributor / retailer) to report
 * a product as stolen or counterfeit. The admin reviews these reports and
 * decides whether to call flagDispute() on-chain.
 */
const disputeReportSchema = new mongoose.Schema(
  {
    /** The product being reported. */
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    /** The user who filed the report (distributor / retailer). */
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** Free-text reason supplied by the reporter. */
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    /**
     * Lifecycle:
     *   pending  — report filed, awaiting admin review
     *   flagged  — admin called flagDispute() on-chain successfully
     *   rejected — admin dismissed the report (no on-chain action taken)
     */
    status: {
      type: String,
      enum: ["pending", "flagged", "rejected"],
      default: "pending",
    },
    /** TX hash from the on-chain flagDispute() call (set when status = flagged). */
    blockchainTxHash: {
      type: String,
      default: null,
    },
    /** Admin who acted on the report (flagged or rejected). */
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /** ISO timestamp of when the admin took action. */
    resolvedAt: {
      type: Date,
      default: null,
    },
    /** Admin note on resolution (optional). */
    adminNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

disputeReportSchema.index({ product: 1, status: 1 });
disputeReportSchema.index({ reportedBy: 1, createdAt: -1 });

module.exports = mongoose.model("DisputeReport", disputeReportSchema);
