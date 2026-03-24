require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./config/db");

const port = Number(process.env.PORT || 3000);
const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/supply-chain";

async function startServer() {
  try {
    await connectDB(mongoUri);
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
