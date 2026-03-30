/**
 * blockchain.js — Day 9
 *
 * Lazy singleton: creates the ethers provider, signer (backend wallet),
 * and Contract instance on first use.
 *
 * Required env vars:
 *   BLOCKCHAIN_RPC_URL   – JSON-RPC endpoint (e.g. http://127.0.0.1:8545)
 *   DEPLOYER_PRIVATE_KEY – private key of the backend/deployer wallet
 *   CONTRACT_ADDRESS     – deployed SupplyChainRegistry address
 *
 * If any of these are missing the module returns null, and the adapters
 * skip the chain call gracefully (DB-only mode).
 */

const path = require("path");
const { ethers } = require("ethers");

// Load the standalone ABI copy (sibling of backend/ under project root)
const ABI = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "blockchain",
  "exported-abi.json"
));

let _cache = null;

/**
 * Returns { provider, signer, contract } or null when not configured.
 */
function getChainClient() {
  if (_cache) return _cache;

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    // Not configured — chain calls will be skipped silently.
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, ABI, signer);

  _cache = { provider, signer, contract };
  return _cache;
}

/**
 * Reset cached client (useful in tests).
 */
function resetChainClient() {
  _cache = null;
}

module.exports = { getChainClient, resetChainClient };
