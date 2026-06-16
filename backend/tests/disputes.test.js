/**
 * disputes.test.js
 * Tests: POST /api/disputes/report, GET /api/disputes/my,
 *        GET /api/disputes, POST /api/disputes/:id/flag,
 *        POST /api/disputes/:id/reject
 */

const request = require("supertest");
const { connect, clearDB, disconnect, getApp } = require("./setup");

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
  const name = `${emailPrefix} Name`;
  await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "Pass123!", role });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Pass123!" });
  return { token: res.body.token, userId: res.body.user.id };
}

async function createProduct(token, sku = "SKU-D-001") {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({ sku, name: "Dispute Test Widget", price: 100 });
  return res.body.product;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Disputes API Flow", () => {
  let mfrToken, distToken, adminToken, distId, product;

  beforeEach(async () => {
    ({ token: mfrToken } = await registerAndLogin("manufacturer", "mfr"));
    ({ token: distToken, userId: distId } = await registerAndLogin("distributor", "dist"));
    ({ token: adminToken } = await registerAndLogin("admin", "adm"));
    product = await createProduct(mfrToken, "SKU-D-001");
  });

  it("permits any user to file a dispute report", async () => {
    const res = await request(app)
      .post("/api/disputes/report")
      .set("Authorization", `Bearer ${distToken}`)
      .send({ productId: product._id, reason: "Product reported as stolen." });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.report.product._id).toBe(product._id);
    expect(res.body.report.status).toBe("pending");
  });

  it("prevents double reporting the same product while pending", async () => {
    await request(app)
      .post("/api/disputes/report")
      .set("Authorization", `Bearer ${distToken}`)
      .send({ productId: product._id, reason: "First report." });

    const res = await request(app)
      .post("/api/disputes/report")
      .set("Authorization", `Bearer ${distToken}`)
      .send({ productId: product._id, reason: "Second report." });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("lists reports for the reporter via GET /api/disputes/my", async () => {
    await request(app)
      .post("/api/disputes/report")
      .set("Authorization", `Bearer ${distToken}`)
      .send({ productId: product._id, reason: "My dispute." });

    const res = await request(app)
      .get("/api/disputes/my")
      .set("Authorization", `Bearer ${distToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports.length).toBe(1);
    expect(res.body.reports[0].reason).toBe("My dispute.");
  });

  it("allows admins to list disputes, but blocks non-admins", async () => {
    await request(app)
      .post("/api/disputes/report")
      .set("Authorization", `Bearer ${distToken}`)
      .send({ productId: product._id, reason: "Reporting stolen widget." });

    // Non-admin query (distributor) should fail (403)
    const failRes = await request(app)
      .get("/api/disputes")
      .set("Authorization", `Bearer ${distToken}`);
    expect(failRes.status).toBe(403);

    // Admin query should succeed (200)
    const successRes = await request(app)
      .get("/api/disputes")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(successRes.status).toBe(200);
    expect(successRes.body.total).toBe(1);
    expect(successRes.body.reports[0].reason).toBe("Reporting stolen widget.");
  });

  it("allows admin to flag a product as disputed", async () => {
    const reportRes = await request(app)
      .post("/api/disputes/report")
      .set("Authorization", `Bearer ${distToken}`)
      .send({ productId: product._id, reason: "Reporting stolen widget." });

    const reportId = reportRes.body.report._id;

    const flagRes = await request(app)
      .post(`/api/disputes/${reportId}/flag`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ adminNote: "Flagged on-chain." });

    expect(flagRes.status).toBe(200);
    expect(flagRes.body.success).toBe(true);
    expect(flagRes.body.report.status).toBe("flagged");
    expect(flagRes.body.report.adminNote).toBe("Flagged on-chain.");
  });

  it("allows admin to reject a dispute report", async () => {
    const reportRes = await request(app)
      .post("/api/disputes/report")
      .set("Authorization", `Bearer ${distToken}`)
      .send({ productId: product._id, reason: "Reporting stolen widget." });

    const reportId = reportRes.body.report._id;

    const rejectRes = await request(app)
      .post(`/api/disputes/${reportId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ adminNote: "Dismissed report." });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);
    expect(rejectRes.body.report.status).toBe("rejected");
    expect(rejectRes.body.report.adminNote).toBe("Dismissed report.");
  });
});
