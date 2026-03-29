const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChainRegistry", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SupplyChainRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();
    return { registry, owner, other };
  }

  it("deploys with a valid address", async function () {
    const { registry } = await deployFixture();
    const addr = await registry.getAddress();
    expect(addr).to.match(/^0x[a-fA-F0-9]{40}$/);
  });

  it("registers a product and emits ProductRegistered", async function () {
    const { registry, owner } = await deployFixture();
    const productId = ethers.id("SKU-001");
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("payload"));

    await expect(registry.registerProduct(productId, contentHash)).to.emit(
      registry,
      "ProductRegistered"
    );

    const [hash, registeredOwner] = await registry.getProduct(productId);
    expect(hash).to.equal(contentHash);
    expect(registeredOwner).to.equal(owner.address);
  });

  it("transfers ownership", async function () {
    const { registry, owner, other } = await deployFixture();
    const productId = ethers.id("SKU-002");
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("payload-2"));

    await registry.registerProduct(productId, contentHash);

    await expect(registry.transferOwnership(productId, other.address)).to.emit(
      registry,
      "OwnershipTransferred"
    );

    const [, newOwner] = await registry.getProduct(productId);
    expect(newOwner).to.equal(other.address);
  });
});
