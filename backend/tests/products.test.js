/**
 * products.test.js 
 * Tests: GET /api/products, GET /api/products/:id, POST /api/products
 *
 * Chain calls (registerProductOnChain) are silently skipped because
 * BLOCKCHAIN_RPC_URL is absent — confirmed in setup.js.
 */

const request = require("supertest");
const { connect, clearDB, disconnect, getApp, authHeader } = require("../setup");

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

/** Register + login → return token */
async function loginAs(role = "manufacturer") {
  const email = `${role}_${Date.now()}@test.com`;
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Pass123!", role });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Pass123!" });
  return res.body.token;
}

const sampleProduct = {
  sku: "SKU-TEST-001",
  name: "Widget Alpha",
  description: "A test widget",
  price: 49.99,
};

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe("Auth guard on product routes", () => {
  it("GET /api/products returns 401 without token", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
  });

  it("POST /api/products returns 401 without token", async () => {
    const res = await request(app).post("/api/products").send(sampleProduct);
    expect(res.status).toBe(401);
  });
});

// ─── Role guard ───────────────────────────────────────────────────────────────

describe("Role guard on POST /api/products", () => {
  it("rejects retailer role with 403", async () => {
    const token = await loginAs("retailer");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleProduct);
    expect(res.status).toBe(403);
  });

  it("allows manufacturer role", async () => {
    const token = await loginAs("manufacturer");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleProduct);
    expect(res.status).toBe(201);
  });

  it("allows admin role", async () => {
    const token = await loginAs("admin");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...sampleProduct, sku: "SKU-ADMIN-001" });
    expect(res.status).toBe(201);
  });
});

// ─── Create product ───────────────────────────────────────────────────────────

describe("POST /api/products", () => {
  let token;

  beforeEach(async () => {
    token = await loginAs("manufacturer");
  });

  it("creates a product and returns it with contentHash", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleProduct);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.product.sku).toBe(sampleProduct.sku);
    expect(res.body.product.name).toBe(sampleProduct.name);
    expect(typeof res.body.product.contentHash).toBe("string");
    expect(res.body.product.contentHash).toHaveLength(64); // SHA-256 hex
  });

  it("rejects duplicate SKU with 409", async () => {
    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleProduct);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleProduct);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing required fields with 400", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "No SKU or Price" });

    expect(res.status).toBe(400);
  });
});

// ─── List + Get ──────────────────────────────────────────────────────────────

describe("GET /api/products", () => {
  let token;
  let createdProductId;

  beforeEach(async () => {
    token = await loginAs("manufacturer");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleProduct);
    createdProductId = res.body.product._id;
  });

  it("lists all products", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.products[0].sku).toBe(sampleProduct.sku);
  });

  it("fetches a product by id", async () => {
    const res = await request(app)
      .get(`/api/products/${createdProductId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.product._id).toBe(createdProductId);
  });

  it("returns 404 for unknown product id", async () => {
    const fakeId = "64a1f2b3c4d5e6f7a8b9c0d1";
    const res = await request(app)
      .get(`/api/products/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
