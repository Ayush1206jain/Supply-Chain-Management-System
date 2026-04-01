require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./config/db");
const { startRetryJob } = require("./jobs/startRetryJob");

const port = Number(process.env.PORT || 3000);
const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/supply-chain";

  console.log("Mongo URI:", process.env.MONGODB_URI);

async function startServer() {
  try {
    await connectDB(mongoUri);
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
      // Start the background blockchain sync retry job 
      startRetryJob();
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
