const jwt = require("jsonwebtoken");

const JWT_ALG = "HS256";

function getJwtSecret() {
  // For local development you can rely on .env; if not set we use a dev default
  // so the server can still boot and routes can be tested.
  return process.env.JWT_SECRET || "dev-jwt-secret";
}

function signAccessToken(payload) {
  // payload should contain: { sub, role, email }
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    algorithm: JWT_ALG,
    expiresIn: "7d",
  });
}

function verifyAccessToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret, { algorithms: [JWT_ALG] });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};

