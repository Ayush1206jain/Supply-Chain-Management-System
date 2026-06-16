const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // ─── Deploy SupplyChainRegistry ──────────────────────────────────
  const RegistryFactory = await hre.ethers.getContractFactory("SupplyChainRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("SupplyChainRegistry deployed to:", registryAddress);

  // ─── Summary ────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("  CONTRACT_ADDRESS      =", registryAddress);
  console.log("═══════════════════════════════════════════════");
  console.log("\nUpdate this in:");
  console.log("  backend/.env             → CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
