require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./config/db");
const { startRetryJob } = require("./jobs/startRetryJob");

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
      const server = app.listen(currentPort, () => {
        console.log(`Backend running on http://localhost:${currentPort}`);
        startRetryJob();
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
