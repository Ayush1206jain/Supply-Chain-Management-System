const { ethers } = require("ethers");
const { notifyUser, notifyAdmins } = require("../sockets/notificationSocket");
const Product = require("../models/Product");
const Transfer = require("../models/Transfer");
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "..", "..", "event_listener.log");

function logToFile(message) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    console.error("Failed to write log file:", err.message);
  }
}

let listenerActive = false;

function getMongoIdFromBytes32(bytes32Str) {
  if (!bytes32Str) return "";
  return bytes32Str.toLowerCase().slice(-24);
}

async function startContractEventListener(contractAddress, abi, rpcUrl) {
  if (listenerActive) {
    logToFile("Event listener already running — skipping start");
    console.log("Event listener already running — skipping");
    return;
  }

  let provider;
  try {
    const wsUrl = rpcUrl.replace("http://", "ws://").replace("https://", "wss://");
    provider = new ethers.WebSocketProvider(wsUrl);
    logToFile("Event listener: using WebSocket provider: " + wsUrl);
    console.log("Event listener: using WebSocket provider");
  } catch (e) {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    logToFile("Event listener: using HTTP polling provider: " + rpcUrl);
    console.log("Event listener: using HTTP polling provider");
  }

  const contract = new ethers.Contract(contractAddress, abi, provider);
  listenerActive = true;
  logToFile("Contract event listener started on address: " + contractAddress);

  // ── ProductRegistered event ───────────────────────────────────────
  contract.on("ProductRegistered", async (productId, contentHash, owner, timestamp, event) => {
    const msg = `Event: ProductRegistered — productId=${productId}`;
    logToFile(msg);
    console.log(msg);
    try {
      const mongoId = getMongoIdFromBytes32(productId);
      const product = await Product.findById(mongoId).populate("createdBy", "_id email");
      if (!product) {
        logToFile(`ProductRegistered: Product not found in DB for mongoId=${mongoId}`);
        return;
      }

      const notification = {
        type: "PRODUCT_REGISTERED",
        title: "Product Anchored to Blockchain",
        message: `${product.name} (${product.sku}) has been registered on-chain.`,
        productId: product._id.toString(),
        sku: product.sku,
        txHash: event.log.transactionHash,
        timestamp: Number(timestamp) * 1000,
      };

      // Notify the creator
      if (product.createdBy) {
        logToFile(`ProductRegistered: Notifying creator user:${product.createdBy._id}`);
        notifyUser(product.createdBy._id.toString(), "notification", notification);
      }

      // Notify all admins
      notifyAdmins("notification", { ...notification, title: "[Admin] " + notification.title });
    } catch (err) {
      logToFile(`ProductRegistered handler error: ${err.message}`);
      console.error("EventListener: ProductRegistered handler error:", err.message);
    }
  });

  // ── TransferInitiated event ───────────────────────────────────────
  contract.on("TransferInitiated", async (productId, from, to, timestamp, event) => {
    const msg = `Event: TransferInitiated — productId=${productId} from=${from} to=${to}`;
    logToFile(msg);
    console.log(msg);
    try {
      const mongoId = getMongoIdFromBytes32(productId);
      const product = await Product.findById(mongoId);
      if (!product) {
        logToFile(`TransferInitiated: Product not found in DB for mongoId=${mongoId}`);
        return;
      }

      const transfer = await Transfer.findOne({
        product: product._id,
        syncStatus: { $in: ["pending", "confirmed"] },
        receiverConfirmed: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .populate("fromUser toUser", "_id email");

      if (!transfer) {
        logToFile(`TransferInitiated: No matching pending/confirmed transfer in DB for product=${product._id}`);
        return;
      }

      // Notify the RECEIVER — they need to confirm
      if (transfer.toUser) {
        logToFile(`TransferInitiated: Notifying receiver user:${transfer.toUser._id}`);
        notifyUser(transfer.toUser._id.toString(), "notification", {
          type: "TRANSFER_PENDING_CONFIRMATION",
          title: "Action Required: Confirm Transfer",
          message: `${transfer.fromUser?.email || "Someone"} has transferred ${product.name} to you. Please confirm receipt.`,
          productId: product._id.toString(),
          transferId: transfer._id.toString(),
          sku: product.sku,
          txHash: event.log.transactionHash,
          timestamp: Number(timestamp) * 1000,
          actionRequired: true,
        });
      }
    } catch (err) {
      logToFile(`TransferInitiated handler error: ${err.message}`);
      console.error("EventListener: TransferInitiated handler error:", err.message);
    }
  });

  // ── TransferConfirmed event ───────────────────────────────────────
  contract.on("TransferConfirmed", async (productId, from, to, timestamp, event) => {
    const msg = `Event: TransferConfirmed — productId=${productId} from=${from} to=${to}`;
    logToFile(msg);
    console.log(msg);
    try {
      const mongoId = getMongoIdFromBytes32(productId);
      const product = await Product.findById(mongoId).populate("owner", "_id email");
      if (!product) {
        logToFile(`TransferConfirmed: Product not found in DB for mongoId=${mongoId}`);
        return;
      }

      const transfer = await Transfer.findOne({
        product: product._id,
        receiverConfirmed: true,
      })
        .sort({ updatedAt: -1 })
        .populate("fromUser", "_id email");

      if (!transfer) {
        logToFile(`TransferConfirmed: No matching confirmed transfer in DB for product=${product._id}`);
        return;
      }

      const notification = {
        type: "TRANSFER_CONFIRMED",
        title: "Transfer Confirmed",
        message: `Ownership of ${product.name} has been confirmed on-chain.`,
        productId: product._id.toString(),
        sku: product.sku,
        txHash: event.log.transactionHash,
        timestamp: Number(timestamp) * 1000,
      };

      // Notify both sender and receiver
      if (transfer.fromUser) {
        logToFile(`TransferConfirmed: Notifying sender user:${transfer.fromUser._id}`);
        notifyUser(transfer.fromUser._id.toString(), "notification", notification);
      }
      if (product.owner) {
        logToFile(`TransferConfirmed: Notifying owner user:${product.owner._id}`);
        notifyUser(product.owner._id.toString(), "notification", notification);
      }
    } catch (err) {
      logToFile(`TransferConfirmed handler error: ${err.message}`);
      console.error("EventListener: TransferConfirmed handler error:", err.message);
    }
  });

  // ── DisputeRaised event ───────────────────────────────────────────
  contract.on("DisputeRaised", async (productId, flaggedBy, timestamp, event) => {
    const msg = `Event: DisputeRaised — productId=${productId} flaggedBy=${flaggedBy}`;
    logToFile(msg);
    console.log(msg);
    try {
      const mongoId = getMongoIdFromBytes32(productId);
      const product = await Product.findById(mongoId).populate("owner createdBy", "_id email");
      if (!product) {
        logToFile(`DisputeRaised: Product not found in DB for mongoId=${mongoId}`);
        return;
      }

      const notification = {
        type: "DISPUTE_RAISED",
        title: "⚠️ Product Dispute Flagged",
        message: `${product.name} (${product.sku}) has been flagged as DISPUTED on-chain.`,
        productId: product._id.toString(),
        sku: product.sku,
        txHash: event.log.transactionHash,
        timestamp: Number(timestamp) * 1000,
        urgent: true,
      };

      // Notify current owner, original creator, and all admins
      if (product.owner) {
        logToFile(`DisputeRaised: Notifying owner user:${product.owner._id}`);
        notifyUser(product.owner._id.toString(), "notification", notification);
      }
      if (product.createdBy && product.createdBy._id.toString() !== product.owner?._id.toString()) {
        logToFile(`DisputeRaised: Notifying creator user:${product.createdBy._id}`);
        notifyUser(product.createdBy._id.toString(), "notification", notification);
      }
      notifyAdmins("notification", notification);
    } catch (err) {
      logToFile(`DisputeRaised handler error: ${err.message}`);
      console.error("EventListener: DisputeRaised handler error:", err.message);
    }
  });

  // Handle provider connection errors/disconnects
  if (provider.on) {
    provider.on("error", (err) => {
      logToFile(`Event listener provider error: ${err.message}`);
      console.error("Event listener provider error:", err.message);
      listenerActive = false;
      setTimeout(() => startContractEventListener(contractAddress, abi, rpcUrl), 5000);
    });
  }

  logToFile("Contract event listener started successfully");
  console.log("Contract event listener started");
}

module.exports = {
  startContractEventListener,
};
