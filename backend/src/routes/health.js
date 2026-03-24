const express = require("express");
const { getDbStatus } = require("../config/db");

const router = express.Router();

router.get("/", (req, res) => {
  const dbStatus = getDbStatus();
  const ok = dbStatus === "connected";

  res.status(ok ? 200 : 503).json({
    success: ok,
    service: "supply-chain-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dbStatus,
  });
});

module.exports = router;
