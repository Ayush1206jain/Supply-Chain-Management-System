/**
 * auth.test.js 
 * Tests: POST /api/auth/register, POST /api/auth/login
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

// ─── Register ────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("creates a new user and returns 201", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "mfr@test.com",
      password: "Secret123!",
      role: "manufacturer",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("mfr@test.com");
    expect(res.body.user.role).toBe("manufacturer");
    // password must never be returned
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email with 409", async () => {
    const payload = { email: "dup@test.com", password: "pw", role: "retailer" };
    await request(app).post("/api/auth/register").send(payload);
    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing fields with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "x@x.com" }); // missing password + role

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects invalid role with 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "x@x.com",
      password: "pw",
      role: "hacker",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // seed one user
    await request(app).post("/api/auth/register").send({
      email: "user@test.com",
      password: "Correct99!",
      role: "distributor",
    });
  });

  it("returns a JWT token on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "Correct99!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.role).toBe("distributor");
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "WrongPassword" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects unknown email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "pw" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing fields with 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com" });

    expect(res.status).toBe(400);
  });
});
