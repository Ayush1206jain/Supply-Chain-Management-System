/**
 * sync.test.js
 * Tests: GET /api/sync/status, POST /api/sync/trigger,
 *        GET /api/sync/failed-transfers, GET /api/sync/unanchored-products
 *
 * Chain is not configured — products will have no blockchainTxHash and
 * transfers will have syncStatus='failed', giving us data to assert on.
 */

const request = require("supertest");
const { connect, clearDB, disconnect, getApp } = require("../setup");

let app;

beforeAll(async () => {
  await connect();
  app = getApp();
});

afterEach(async () => {
  await clearDB();
});

afterAll(async () => {
  await disconnect();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function registerAndLogin(role, prefix) {
  const email = `${prefix}_${Date.now()}@sync-test.com`;
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Pass123!", role });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Pass123!" });
  return { token: res.body.token, userId: res.body.user.id };
}

async function createProduct(token, sku) {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({ sku, name: "Sync Widget", price: 10 });
  return res.body.product;
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe("Auth guard on sync routes", () => {
  it("GET /api/sync/status returns 401 without token", async () => {
    const res = await request(app).get("/api/sync/status");
    expect(res.status).toBe(401);
  });

  it("POST /api/sync/trigger returns 401 without token", async () => {
    const res = await request(app).post("/api/sync/trigger");
    expect(res.status).toBe(401);
  });
});

// ─── Role guard ───────────────────────────────────────────────────────────────

describe("Role guard on admin-only sync routes", () => {
  let mfrToken;

  beforeEach(async () => {
    ({ token: mfrToken } = await registerAndLogin("manufacturer", "mfr_sync"));
  });

  it("POST /api/sync/trigger returns 403 for non-admin", async () => {
    const res = await request(app)
      .post("/api/sync/trigger")
      .set("Authorization", `Bearer ${mfrToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/sync/failed-transfers returns 403 for non-admin", async () => {
    const res = await request(app)
      .get("/api/sync/failed-transfers")
      .set("Authorization", `Bearer ${mfrToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/sync/unanchored-products returns 403 for non-admin", async () => {
    const res = await request(app)
      .get("/api/sync/unanchored-products")
      .set("Authorization", `Bearer ${mfrToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/sync/status ─────────────────────────────────────────────────────

describe("GET /api/sync/status", () => {
  let mfrToken, adminToken, distId;

  beforeEach(async () => {
    ({ token: mfrToken } = await registerAndLogin("manufacturer", "mfr_st"));
    ({ token: adminToken } = await registerAndLogin("admin", "adm_st"));
    ({ userId: distId } = await registerAndLogin("distributor", "dist_st"));
  });

  it("returns zero counts on an empty DB", async () => {
    const res = await request(app)
      .get("/api/sync/status")
      .set("Authorization", `Bearer ${mfrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.syncStatus.totalRetryable).toBe(0);
    expect(res.body.syncStatus.transfers).toBeDefined();
    expect(res.body.syncStatus.products).toBeDefined();
  });

  it("counts unanchored products after creation (no chain configured)", async () => {
    await createProduct(mfrToken, "SYNC-SKU-001");

    const res = await request(app)
      .get("/api/sync/status")
      .set("Authorization", `Bearer ${mfrToken}`);

    expect(res.status).toBe(200);
    // Product has no blockchainTxHash → shows up as unanchoredRetryable
    expect(res.body.syncStatus.products.unanchoredRetryable).toBeGreaterThanOrEqual(1);
    expect(res.body.syncStatus.totalRetryable).toBeGreaterThanOrEqual(1);
  });

  it("note field changes based on whether records need retry", async () => {
    const emptyRes = await request(app)
      .get("/api/sync/status")
      .set("Authorization", `Bearer ${mfrToken}`);
    expect(emptyRes.body.note).toMatch(/All records/);

    await createProduct(mfrToken, "SYNC-SKU-002");

    const res = await request(app)
      .get("/api/sync/status")
      .set("Authorization", `Bearer ${mfrToken}`);
    expect(res.body.note).toMatch(/queued for retry/);
  });
});

// ─── POST /api/sync/trigger ───────────────────────────────────────────────────

describe("POST /api/sync/trigger", () => {
  let adminToken, mfrToken;

  beforeEach(async () => {
    ({ token: adminToken } = await registerAndLogin("admin", "adm_trig"));
    ({ token: mfrToken } = await registerAndLogin("manufacturer", "mfr_trig"));
    await createProduct(mfrToken, "TRIG-SKU-001");
  });

  it("admin can trigger a sync pass and get a result summary", async () => {
    const res = await request(app)
      .post("/api/sync/trigger")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBeDefined();
    expect(res.body.result.ranAt).toBeDefined();
    expect(res.body.result.transfers).toBeDefined();
    expect(res.body.result.products).toBeDefined();
    expect(res.body.remainingAfter).toBeDefined();
  });
});

// ─── GET /api/sync/unanchored-products ───────────────────────────────────────

describe("GET /api/sync/unanchored-products", () => {
  let adminToken, mfrToken;

  beforeEach(async () => {
    ({ token: adminToken } = await registerAndLogin("admin", "adm_ua"));
    ({ token: mfrToken } = await registerAndLogin("manufacturer", "mfr_ua"));
    await createProduct(mfrToken, "UNANCHORED-SKU-001");
  });

  it("lists products without blockchainTxHash", async () => {
    const res = await request(app)
      .get("/api/sync/unanchored-products")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.products[0].sku).toBe("UNANCHORED-SKU-001");
    expect(typeof res.body.products[0].retriesRemaining).toBe("number");
  });

  it("supports pagination via page and limit query params", async () => {
    await createProduct(mfrToken, "UNANCHORED-SKU-002");

    const res = await request(app)
      .get("/api/sync/unanchored-products?page=1&limit=1")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.limit).toBe(1);
  });
});

// ─── GET /api/sync/failed-transfers ──────────────────────────────────────────

describe("GET /api/sync/failed-transfers", () => {
  let adminToken, mfrToken, distId;

  beforeEach(async () => {
    ({ token: adminToken } = await registerAndLogin("admin", "adm_ft"));
    ({ token: mfrToken } = await registerAndLogin("manufacturer", "mfr_ft"));
    ({ userId: distId } = await registerAndLogin("distributor", "dist_ft"));

    const product = await createProduct(mfrToken, "FAILED-SKU-001");
    // Transfer will have syncStatus='failed' since no chain is configured
    await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${mfrToken}`)
      .send({ productId: product._id, toUserId: distId });
  });

  it("lists failed/pending transfers", async () => {
    const res = await request(app)
      .get("/api/sync/failed-transfers")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(["failed", "pending"]).toContain(
      res.body.transfers[0].syncStatus
    );
    expect(typeof res.body.transfers[0].retriesRemaining).toBe("number");
  });
});
