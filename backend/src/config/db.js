const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
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
};
