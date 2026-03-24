const express = require("express");
const healthRouter = require("./routes/health");

const app = express();

app.use(express.json());
app.use("/health", healthRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
