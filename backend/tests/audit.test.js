/**
 * audit.test.js 
 * Tests: GET /api/audit/:productId, GET /api/audit/:productId/verify
 *
 * Chain is not configured — chainState.available = false in every response.
 * We test DB-level integrity (hash re-computation) and the structure of the
 * audit report.
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
  const email = `${prefix}@audit-test.com`;
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Pass123!", role });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Pass123!" });
  return { token: res.body.token, userId: res.body.user.id };
}

async function createProduct(token, sku = "AUDIT-SKU-001") {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({ sku, name: "Audit Widget", description: "desc", price: 55 });
  return res.body.product;
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe("Auth guard on audit routes", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get(
      "/api/audit/64a1f2b3c4d5e6f7a8b9c0d1"
    );
    expect(res.status).toBe(401);
  });
});

// ─── Full audit report ────────────────────────────────────────────────────────

describe("GET /api/audit/:productId", () => {
  let token, product;

  beforeEach(async () => {
    ({ token } = await registerAndLogin("manufacturer", "mfr_audit"));
    product = await createProduct(token);
  });

  it("returns a full audit report with correct structure", async () => {
    const res = await request(app)
      .get(`/api/audit/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { auditReport } = res.body;
    // Product block
    expect(auditReport.product.sku).toBe("AUDIT-SKU-001");
    expect(auditReport.product.contentHash).toHaveLength(64);

    // Transfer history block (empty — no transfers yet)
    expect(Array.isArray(auditReport.transferHistory)).toBe(true);
    expect(auditReport.transferHistory).toHaveLength(0);

    // Chain state block (no chain configured)
    expect(auditReport.chainState.available).toBe(false);

    // Integrity block
    expect(auditReport.integrity).toBeDefined();
    expect(auditReport.integrity.dbFieldIntegrity.status).toBe("ok");
    // hashConsistency must be 'not_anchored' (no chain)
    expect(auditReport.integrity.hashConsistency.status).toBe("not_anchored");
    // overallVerified = false because chain is not anchored
    expect(auditReport.integrity.overallVerified).toBe(false);
  });

  it("includes transfer history after a transfer", async () => {
    const { token: distToken, userId: distId } = await registerAndLogin(
      "distributor",
      "dist_audit"
    );

    await request(app)
      .post("/api/transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product._id, toUserId: distId });

    const res = await request(app)
      .get(`/api/audit/${product._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.auditReport.transferHistory).toHaveLength(1);
    expect(res.body.auditReport.transferHistory[0].syncStatus).toBeDefined();
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app)
      .get("/api/audit/64a1f2b3c4d5e6f7a8b9c0d9")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── Verify endpoint ──────────────────────────────────────────────────────────

describe("GET /api/audit/:productId/verify", () => {
  let token, product;

  beforeEach(async () => {
    ({ token } = await registerAndLogin("manufacturer", "mfr_verify"));
    product = await createProduct(token, "VERIFY-SKU-001");
  });

  it("returns a lightweight verification result", async () => {
    const res = await request(app)
      .get(`/api/audit/${product._id}/verify`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.verified).toBe("boolean");
    expect(res.body.hashConsistency).toBeDefined();
    expect(res.body.dbFieldIntegrity).toBe("ok"); // fields unchanged since creation
    expect(res.body.chainAvailable).toBe(false);
    expect(typeof res.body.summary).toBe("string");
  });

  it("dbFieldIntegrity is ok immediately after creation", async () => {
    const res = await request(app)
      .get(`/api/audit/${product._id}/verify`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.dbFieldIntegrity).toBe("ok");
  });
});
