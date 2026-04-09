/**
 * transfers.test.js 
 * Tests: POST /api/transfers, GET /api/transfers/product/:productId
 *
 * Chain calls (transferOwnershipOnChain) are silently skipped — DB sync
 * behaviour is tested; syncStatus will be 'failed' (no chain configured).
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

async function registerAndLogin(role, emailPrefix) {
  const email = `${emailPrefix}@test.com`;
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Pass123!", role });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Pass123!" });
  return { token: res.body.token, userId: res.body.user.id };
}

async function createProduct(token, sku = "SKU-T-001") {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({ sku, name: "Transfer Widget", price: 10 });
  return res.body.product;
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe("Auth guard on transfer routes", () => {
  it("POST /api/transfers returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/transfers")
      .send({ productId: "abc", toUserId: "xyz" });
    expect(res.status).toBe(401);
  });
});

// ─── Create transfer ──────────────────────────────────────────────────────────

describe("POST /api/transfers", () => {
  let mfrToken, mfrId, distToken, distId, product;

  beforeEach(async () => {
    ({ token: mfrToken, userId: mfrId } = await registerAndLogin(
      "manufacturer",
      "mfr"
    ));
    ({ token: distToken, userId: distId } = await registerAndLogin(
      "distributor",
      "dist"
    ));
    product = await createProduct(mfrToken, "SKU-T-001");
  });

  it("transfers product ownership and returns 201", async () => {
    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${mfrToken}`)
      .send({ productId: product._id, toUserId: distId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // New owner should be the distributor
    expect(res.body.product.owner._id).toBe(distId);
    // blockchainSyncStatus is present (either 'failed' since no chain is configured)
    expect(["confirmed", "failed"]).toContain(res.body.blockchainSyncStatus);
  });

  it("rejects transfer by non-owner with 403", async () => {
    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${distToken}`) // distributor is not the owner
      .send({ productId: product._id, toUserId: mfrId });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("rejects self-transfer with 400", async () => {
    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${mfrToken}`)
      .send({ productId: product._id, toUserId: mfrId });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing productId / toUserId with 400", async () => {
    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${mfrToken}`)
      .send({ productId: product._id }); // missing toUserId

    expect(res.status).toBe(400);
  });

  it("rejects unknown product with 404", async () => {
    const fakeProductId = "64a1f2b3c4d5e6f7a8b9c0d1";
    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${mfrToken}`)
      .send({ productId: fakeProductId, toUserId: distId });

    expect(res.status).toBe(404);
  });

  it("rejects unknown toUser with 404", async () => {
    const fakeUserId = "64a1f2b3c4d5e6f7a8b9c0d2";
    const res = await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${mfrToken}`)
      .send({ productId: product._id, toUserId: fakeUserId });

    expect(res.status).toBe(404);
  });
});

// ─── List transfers by product ────────────────────────────────────────────────

describe("GET /api/transfers/product/:productId", () => {
  let mfrToken, distId, product;

  beforeEach(async () => {
    ({ token: mfrToken } = await registerAndLogin("manufacturer", "mfr2"));
    let distRes;
    ({ token: distRes, userId: distId } = await registerAndLogin(
      "distributor",
      "dist2"
    ));
    product = await createProduct(mfrToken, "SKU-T-002");

    // Perform one transfer
    await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${mfrToken}`)
      .send({ productId: product._id, toUserId: distId });
  });

  it("returns transfer history for a product", async () => {
    const res = await request(app)
      .get(`/api/transfers/product/${product._id}`)
      .set("Authorization", `Bearer ${mfrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.transfers[0].syncStatus).toBeDefined();
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app)
      .get("/api/transfers/product/64a1f2b3c4d5e6f7a8b9c0d3")
      .set("Authorization", `Bearer ${mfrToken}`);

    expect(res.status).toBe(404);
  });
});
