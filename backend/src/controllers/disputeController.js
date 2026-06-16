const { DisputeReport, Product } = require("../models");
const { flagDisputeOnChain } = require("../utils/chainAdapter");

// ─── POST /api/disputes/report ────────────────────────────────────────────────
// Any authenticated user who is a receiver (distributor / retailer) can file
// a report. They must supply a productId and a reason. Manufacturers and admins
// are also allowed (no hard restriction server-side; UI restricts further).

/**
 * POST /api/disputes/report
 * Body: { productId, reason }
 * Auth: any authenticated user
 */
async function reportDispute(req, res) {
  const { productId, reason } = req.body || {};

  if (!productId || !reason?.trim()) {
    return res.status(400).json({
      success: false,
      message: "productId and reason are required",
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Prevent duplicate pending reports for the same product by the same user
  const existing = await DisputeReport.findOne({
    product: productId,
    reportedBy: req.user.id,
    status: "pending",
  });
  if (existing) {
    return res.status(409).json({
      success: false,
      message:
        "You already have a pending dispute report for this product. Wait for admin review.",
    });
  }

  const report = await DisputeReport.create({
    product: productId,
    reportedBy: req.user.id,
    reason: reason.trim(),
  });

  const populated = await DisputeReport.findById(report._id)
    .populate("product", "sku name")
    .populate("reportedBy", "email name role");

  return res.status(201).json({
    success: true,
    message: "Dispute report filed. An admin will review it shortly.",
    report: populated,
  });
}

// ─── GET /api/disputes ────────────────────────────────────────────────────────
/**
 * GET /api/disputes
 * Query params: status (pending|flagged|rejected), page, limit
 * Auth: admin only
 */
async function listDisputes(req, res) {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    DisputeReport.find(filter)
      .populate("product", "sku name blockchainTxHash")
      .populate("reportedBy", "email name role")
      .populate("resolvedBy", "email name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    DisputeReport.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    total,
    page: Number(page),
    reports,
  });
}

// ─── GET /api/disputes/my ─────────────────────────────────────────────────────
/**
 * GET /api/disputes/my
 * Returns all dispute reports filed by the current user.
 * Auth: any authenticated user
 */
async function myDisputes(req, res) {
  const reports = await DisputeReport.find({ reportedBy: req.user.id })
    .populate("product", "sku name")
    .populate("resolvedBy", "email name")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: reports.length,
    reports,
  });
}

// ─── POST /api/disputes/:id/flag ─────────────────────────────────────────────
/**
 * POST /api/disputes/:id/flag
 * Body: { adminNote? }
 * Auth: admin only
 *
 * Admin reviews the report, calls flagDispute() on-chain, and sets
 * the on-chain product status to DISPUTED, restricting further transfers.
 */
async function flagDispute(req, res) {
  const { id } = req.params;
  const { adminNote = "" } = req.body || {};

  const report = await DisputeReport.findById(id).populate("product");
  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Dispute report not found",
    });
  }

  if (report.status !== "pending") {
    return res.status(409).json({
      success: false,
      message: `Report is already ${report.status}. Cannot flag again.`,
    });
  }

  // Call flagDispute() on-chain
  const txHash = await flagDisputeOnChain(report.product);

  report.status = "flagged";
  report.blockchainTxHash = txHash || null;
  report.resolvedBy = req.user.id;
  report.resolvedAt = new Date();
  report.adminNote = adminNote.trim();
  await report.save();

  const populated = await DisputeReport.findById(report._id)
    .populate("product", "sku name")
    .populate("reportedBy", "email name role")
    .populate("resolvedBy", "email name");

  return res.status(200).json({
    success: true,
    message: txHash
      ? "Product flagged as DISPUTED on-chain and in DB."
      : "Product flagged in DB (blockchain unavailable — on-chain status pending sync).",
    report: populated,
    blockchainTxHash: txHash || null,
  });
}

// ─── POST /api/disputes/:id/reject ───────────────────────────────────────────
/**
 * POST /api/disputes/:id/reject
 * Body: { adminNote? }
 * Auth: admin only
 *
 * Admin dismisses the dispute report — no on-chain action is taken.
 */
async function rejectDispute(req, res) {
  const { id } = req.params;
  const { adminNote = "" } = req.body || {};

  const report = await DisputeReport.findById(id).populate("product");
  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Dispute report not found",
    });
  }

  if (report.status !== "pending") {
    return res.status(409).json({
      success: false,
      message: `Report is already ${report.status}. Cannot reject again.`,
    });
  }

  report.status = "rejected";
  report.resolvedBy = req.user.id;
  report.resolvedAt = new Date();
  report.adminNote = adminNote.trim();
  await report.save();

  const populated = await DisputeReport.findById(report._id)
    .populate("product", "sku name")
    .populate("reportedBy", "email name role")
    .populate("resolvedBy", "email name");

  return res.status(200).json({
    success: true,
    message: "Dispute report rejected. No on-chain action taken.",
    report: populated,
  });
}

module.exports = {
  reportDispute,
  listDisputes,
  myDisputes,
  flagDispute,
  rejectDispute,
};
