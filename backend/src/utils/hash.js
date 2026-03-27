const crypto = require("crypto");

function generateProductHash({ sku, name, description = "", price }) {
  const normalized = {
    sku: String(sku).trim(),
    name: String(name).trim(),
    description: String(description).trim(),
    price: Number(price),
  };

  const canonical = JSON.stringify(normalized);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

module.exports = {
  generateProductHash,
};

