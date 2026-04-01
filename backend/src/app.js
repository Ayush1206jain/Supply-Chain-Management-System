const express = require("express");
const healthRouter = require("./routes/health");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const transferRoutes = require("./routes/transferRoutes");
const auditRoutes = require("./routes/auditRoutes");
const syncRoutes  = require("./routes/syncRoutes");

const app = express();

app.use(express.json());
app.use("/health", healthRouter);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/sync",  syncRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
