const mongoose = require("mongoose");
let _supportsTransactions = false;

async function connectDB(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  // Detect whether the connected server supports transactions (replica set)
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    // replica set members expose a logicalSessionTimeoutMinutes value
    _supportsTransactions = !!(
      info.logicalSessionTimeoutMinutes && info.setName
    );
  } catch (err) {
    _supportsTransactions = false;
  }
}

function getDbStatus() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] || "unknown";
}

module.exports = {
  connectDB,
  getDbStatus,
  supportsTransactions: () => _supportsTransactions,
};
