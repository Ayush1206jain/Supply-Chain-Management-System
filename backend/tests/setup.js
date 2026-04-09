/**
 * setup.js — shared test helpers for all API tests
 *
 * - Spins up an in-memory MongoDB via mongodb-memory-server so tests never
 *   touch a real database.
 * - Exports `buildApp()` to get a fresh supertest agent wired to the Express
 *   app.
 * - Exports `makeToken(payload)` to mint JWTs for any role without hitting
 *   the register/login endpoints.
 * - The blockchain is intentionally NOT configured in tests (env vars absent)
 *   so all chain calls are silently skipped — DB behaviour is tested in
 *   isolation.
 */

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const { signAccessToken } = require("../src/utils/jwt");

let mongod;

/**
 * Start in-memory MongoDB and connect mongoose before any test runs.
 * Call this from a `beforeAll` in your test file.
 */
async function connect() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

/**
 * Drop all collections between tests to guarantee isolation.
 * Call this from an `afterEach`.
 */
async function clearDB() {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((col) => col.deleteMany({}))
  );
}

/**
 * Disconnect mongoose and stop the in-memory server.
 * Call this from an `afterAll`.
 */
async function disconnect() {
  await mongoose.disconnect();
  await mongod.stop();
}

/**
 * Returns the Express app (already has all routes mounted).
 * Import lazily so env vars are set before requiring app code.
 */
function getApp() {
  // Ensure blockchain env vars are NOT set so chain calls are no-ops in tests
  delete process.env.BLOCKCHAIN_RPC_URL;
  delete process.env.DEPLOYER_PRIVATE_KEY;
  delete process.env.CONTRACT_ADDRESS;

  // Reset module cache so config singletons re-initialize cleanly
  jest.resetModules();
  const app = require("../src/app");
  return app;
}

/**
 * Mint a JWT for a fake user — lets tests call protected routes without
 * registering/logging in through the network.
 *
 * @param {{ id?: string, email?: string, role?: string }} override
 * @returns {string} Bearer token value (without "Bearer " prefix)
 */
function makeToken(override = {}) {
  const payload = {
    sub: override.id || new mongoose.Types.ObjectId().toString(),
    email: override.email || "test@example.com",
    role: override.role || "manufacturer",
    ...override,
  };
  return signAccessToken(payload);
}

/**
 * Convenience: returns { Authorization: 'Bearer <token>' } headers object.
 */
function authHeader(tokenOrOverride = {}) {
  const token =
    typeof tokenOrOverride === "string"
      ? tokenOrOverride
      : makeToken(tokenOrOverride);
  return { Authorization: `Bearer ${token}` };
}

module.exports = { connect, clearDB, disconnect, getApp, makeToken, authHeader };
