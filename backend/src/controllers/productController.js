const { Product } = require("../models");
const { generateProductHash } = require("../utils/hash");
const {
  registerProductOnChain,
  getProductFromChain,
  getPendingTransferFromChain,
} = require("../utils/chainAdapter");

async function createProduct(req, res) {
  const { sku, name, description, price } = req.body || {};

  if (!sku || !name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: "sku, name, and price are required",
    });
  }

  const existing = await Product.findOne({ sku: String(sku).trim() });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Product already exists for this SKU",
    });
  }

  const contentHash = generateProductHash({ sku, name, description, price });
  const owner = req.user.id;

  const product = await Product.create({
    sku: String(sku).trim(),
    name: String(name).trim(),
    description: description || "",
    price: Number(price),
    owner,
    createdBy: req.user.id,
    contentHash,
  });

  //  anchor content hash on-chain ──────────────────────────────────
  // Fire-and-forget: failure does NOT abort the API response.
  const txHash = await registerProductOnChain(product);
  if (txHash) {
    product.blockchainTxHash = txHash;
    product.syncStatus = "confirmed";
  } else {
    product.syncStatus = "failed";
  }
  await product.save();
  // ─────────────────────────────────────────────────────────────────────────

  return res.status(201).json({
    success: true,
    product,
  });
}

async function listProducts(req, res) {
  const products = await Product.find()
    .populate("owner", "name email role")
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
}

async function getProductById(req, res) {
  const { id } = req.params;
  const product = await Product.findById(id)
    .populate("owner", "name email role")
    .populate("createdBy", "name email role");

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  return res.status(200).json({
    success: true,
    product,
  });
}

// Combined DB + chain status ────────────────────────────────────

const STATUS_MAP = ["CREATED", "IN_TRANSIT", "DELIVERED", "DISPUTED"];

/**
 * GET /api/products/:id/status
 * Auth: any authenticated user.
 *
 * Returns a combined view of:
 *   - Core DB fields (productId, sku, name, dbOwner)
 *   - Live on-chain status enum (chainStatus)
 *   - Any pending multi-sig transfer details (pendingTransfer)
 *   - blockchainTxHash from DB
 *
 * If the blockchain is unavailable, chainStatus = 'CHAIN_UNAVAILABLE' and
 * pendingTransfer = null — the response still succeeds (200) so the frontend
 * degrades gracefully.
 */
async function getProductStatus(req, res) {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  let chainStatus = null;
  let pendingTransfer = null;
  let chainLastUpdatedAt = null;

  try {
    // Live chain read — returns null if chain unavailable or not registered
    const chainData = await getProductFromChain(product);
    if (chainData) {
      chainStatus = STATUS_MAP[chainData.status] || "UNKNOWN";
      chainLastUpdatedAt = chainData.lastUpdatedAt
        ? new Date(chainData.lastUpdatedAt * 1000).toISOString()
        : null;
    } else {
      chainStatus = "NOT_ANCHORED";
    }

    // Check for a pending multi-sig transfer
    const pt = await getPendingTransferFromChain(product);
    if (pt && pt.exists) {
      pendingTransfer = {
        from: pt.from,
        to: pt.to,
        initiatedAt: pt.initiatedAt
          ? new Date(pt.initiatedAt * 1000).toISOString()
          : null,
      };
    }
  } catch (e) {
    // Chain read failed — degrade gracefully
    chainStatus = "CHAIN_UNAVAILABLE";
    console.error("[chain] getProductStatus chain read failed:", e.message);
  }

  return res.status(200).json({
    success: true,
    productId: product._id,
    sku: product.sku,
    name: product.name,
    dbOwner: product.owner,
    chainStatus,
    chainLastUpdatedAt,
    pendingTransfer,
    blockchainTxHash: product.blockchainTxHash || null,
  });
}

// GET /api/products/search
// Query params:
//   q          - text search (name, description, sku)
//   status     - chain status: CREATED | IN_TRANSIT | DELIVERED | DISPUTED
//   owner      - userId (filter by owner)
//   syncStatus - DB sync status: pending | confirmed | failed
//   dateFrom   - ISO date string (createdAt >= dateFrom)
//   dateTo     - ISO date string (createdAt <= dateTo)
//   page       - page number, default 1
//   limit      - results per page, default 20, max 100
//   sortBy     - field to sort: createdAt | name | price, default createdAt
//   sortOrder  - asc | desc, default desc
async function searchProducts(req, res) {
  try {
    const {
      q,
      status,
      owner,
      syncStatus,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // ── Build MongoDB filter ──────────────────────────────────────────
    const filter = {};

    // Text search across name, description, sku
    if (q && q.trim()) {
      filter.$text = { $search: q.trim() };
    }

    // Filter by sync status
    if (syncStatus) {
      const allowed = ['pending', 'confirmed', 'failed', 'exhausted'];
      if (!allowed.includes(syncStatus)) {
        return res.status(400).json({ error: 'Invalid syncStatus value' });
      }
      filter.syncStatus = syncStatus;
    }

    // Filter by owner
    // If requester is not admin, they can only see their own or all (no filter)
    if (owner) {
      filter.owner = owner;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }

    // ── Sanitize pagination params ────────────────────────────────────
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // ── Sanitize sort params ──────────────────────────────────────────
    const allowedSortFields = ['createdAt', 'name', 'price', 'sku', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir   = sortOrder === 'asc' ? 1 : -1;
    const sort      = { [sortField]: sortDir };

    // If text search, also sort by relevance score
    // MongoDB text search adds a $meta score
    const projection = q ? { score: { $meta: 'textScore' } } : {};
    if (q) sort.score = { $meta: 'textScore' };

    // If live on-chain status filter is requested
    if (status) {
      const allProducts = await Product.find(filter, projection)
        .populate('owner', 'name email role')
        .populate('createdBy', 'name email role')
        .sort(sort)
        .lean();

      // Resolve live status for all candidate products in parallel
      const productsWithStatus = await Promise.all(
        allProducts.map(async (product) => {
          let chainStatus = "NOT_ANCHORED";
          try {
            const chainData = await getProductFromChain(product);
            if (chainData) {
              chainStatus = STATUS_MAP[chainData.status] || "UNKNOWN";
            }
          } catch (e) {
            chainStatus = "CHAIN_UNAVAILABLE";
          }
          return { ...product, chainStatus };
        })
      );

      // Filter by the requested status
      const filteredProducts = productsWithStatus.filter(
        (p) => p.chainStatus.toUpperCase() === status.toUpperCase()
      );

      const total = filteredProducts.length;
      const totalPages = Math.ceil(total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;
      const paginatedProducts = filteredProducts.slice(skip, skip + limitNum);

      return res.json({
        success: true,
        products: paginatedProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null,
        },
        filters: {
          q: q || null,
          status: status || null,
          owner: owner || null,
          syncStatus: syncStatus || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
      });
    }

    // ── Execute query (count + paginated results in parallel) ─────────
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter, projection)
        .populate('owner', 'name email role')       // join owner details (include name)
        .populate('createdBy', 'name email role')   // join creator details (include name)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),                               // plain JS objects, faster
    ]);

    // ── Build pagination metadata ─────────────────────────────────────
    const totalPages  = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return res.json({
      success: true,
      products,
      pagination: {
        total,          // total matching documents
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage:  hasNextPage ? pageNum + 1 : null,
        prevPage:  hasPrevPage ? pageNum - 1 : null,
      },
      filters: {        // echo back applied filters (useful for frontend)
        q: q || null,
        status: status || null,
        owner: owner || null,
        syncStatus: syncStatus || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      },
    });
  } catch (err) {
    console.error('searchProducts error:', err);
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
}

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  getProductStatus,
  searchProducts,
};


