require("dotenv").config();

const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/db");
const { startRetryJob } = require("./jobs/startRetryJob");
const { initSocketServer } = require("./sockets/notificationSocket");
const { startContractEventListener } = require("./utils/eventListener");
const SupplyChainABI = require("../../blockchain/artifacts/contracts/SupplyChainRegistry.sol/SupplyChainRegistry.json");

const port = Number(process.env.PORT || 3000);
const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/supply-chain";

async function startServer() {
  try {
    await connectDB(mongoUri);
    const maxAttempts = 10;
    let attempts = 0;
    let currentPort = port;

    const tryListen = () => {
      attempts += 1;
      const httpServer = http.createServer(app);
      initSocketServer(httpServer);

      const server = httpServer.listen(currentPort, () => {
        console.log(`Backend running on http://localhost:${currentPort}`);
        console.log("Socket.io listening on the same port");
        startRetryJob();

        // Start contract event listener (only if blockchain is configured)
        if (process.env.CONTRACT_ADDRESS && process.env.BLOCKCHAIN_RPC_URL) {
          startContractEventListener(
            process.env.CONTRACT_ADDRESS,
            SupplyChainABI.abi,
            process.env.BLOCKCHAIN_RPC_URL
          );
        } else {
          console.log("Blockchain not configured — event listener skipped");
        }
      });

      server.on("error", (err) => {
        if (err && err.code === "EADDRINUSE") {
          if (attempts < maxAttempts) {
            console.warn(
              `Port ${currentPort} in use, trying ${currentPort + 1}...`,
            );
            currentPort += 1;
            // small delay to avoid tight loop
            setTimeout(tryListen, 200);
            return;
          }
          console.error(
            `All attempted ports (${port}..${currentPort}) are in use. Please free a port or set PORT to a different value.`,
          );
          process.exit(1);
        }
        throw err;
      });
    };

    tryListen();
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
