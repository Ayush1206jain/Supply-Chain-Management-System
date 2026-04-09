const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChainRegistry", function () {
  // ─── fixture ─────────────────────────────────────────────────────────────

  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SupplyChainRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();
    return { registry, owner, alice, bob };
  }

  // Helper: create a valid productId and contentHash pair
  function makeIds(label) {
    const productId = ethers.id(label);               // keccak256 → bytes32
    const contentHash = ethers.keccak256(             // keccak256 of payload
      ethers.toUtf8Bytes(`payload-${label}`)
    );
    return { productId, contentHash };
  }

  // ─── deployment ───────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("deploys with a valid contract address", async function () {
      const { registry } = await deployFixture();
      const addr = await registry.getAddress();
      expect(addr).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  // ─── registerProduct ──────────────────────────────────────────────────────

  describe("registerProduct", function () {
    it("registers a product and emits ProductRegistered event", async function () {
      const { registry, owner } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-001");

      await expect(registry.registerProduct(productId, contentHash))
        .to.emit(registry, "ProductRegistered")
        .withArgs(productId, contentHash, owner.address, await ethers
          .provider.getBlock("latest").then((b) => b.timestamp + 1));

      // Just check event is emitted without strict timestamp arg
    });

    it("stores contentHash and caller as owner", async function () {
      const { registry, owner } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-002");

      await registry.registerProduct(productId, contentHash);

      const [storedHash, storedOwner, registeredAt] =
        await registry.getProduct(productId);

      expect(storedHash).to.equal(contentHash);
      expect(storedOwner).to.equal(owner.address);
      expect(registeredAt).to.be.gt(0n); // non-zero timestamp
    });

    it("reverts when productId is zero bytes32", async function () {
      const { registry } = await deployFixture();
      const { contentHash } = makeIds("SKU-003");

      await expect(
        registry.registerProduct(ethers.ZeroHash, contentHash)
      ).to.be.revertedWith("invalid product id");
    });

    it("reverts when contentHash is zero bytes32", async function () {
      const { registry } = await deployFixture();
      const { productId } = makeIds("SKU-004");

      await expect(
        registry.registerProduct(productId, ethers.ZeroHash)
      ).to.be.revertedWith("invalid content hash");
    });

    it("reverts on duplicate productId registration", async function () {
      const { registry } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-DUP");

      await registry.registerProduct(productId, contentHash);

      await expect(
        registry.registerProduct(productId, contentHash)
      ).to.be.revertedWith("already registered");
    });

    it("allows two different products to be registered independently", async function () {
      const { registry } = await deployFixture();
      const a = makeIds("SKU-A");
      const b = makeIds("SKU-B");

      await registry.registerProduct(a.productId, a.contentHash);
      await registry.registerProduct(b.productId, b.contentHash);

      const [hashA] = await registry.getProduct(a.productId);
      const [hashB] = await registry.getProduct(b.productId);

      expect(hashA).to.equal(a.contentHash);
      expect(hashB).to.equal(b.contentHash);
      expect(hashA).to.not.equal(hashB);
    });
  });

  // ─── transferOwnership ────────────────────────────────────────────────────

  describe("transferOwnership", function () {
    it("transfers ownership and emits OwnershipTransferred event", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-TR-001");

      await registry.registerProduct(productId, contentHash);

      await expect(registry.transferOwnership(productId, alice.address))
        .to.emit(registry, "OwnershipTransferred");

      const [, newOwner] = await registry.getProduct(productId);
      expect(newOwner).to.equal(alice.address);
    });

    it("previous owner can no longer transfer after handoff", async function () {
      const { registry, owner, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-TR-002");

      await registry.registerProduct(productId, contentHash);
      await registry.transferOwnership(productId, alice.address);

      // owner (original) tries to transfer again → should fail
      await expect(
        registry.transferOwnership(productId, bob.address)
      ).to.be.revertedWith("not owner");
    });

    it("new owner can transfer onwards", async function () {
      const { registry, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-TR-003");

      await registry.registerProduct(productId, contentHash);
      await registry.transferOwnership(productId, alice.address);

      // alice transfers to bob
      await registry.connect(alice).transferOwnership(productId, bob.address);

      const [, finalOwner] = await registry.getProduct(productId);
      expect(finalOwner).to.equal(bob.address);
    });

    it("reverts when transferring to zero address", async function () {
      const { registry } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-TR-ZERO");

      await registry.registerProduct(productId, contentHash);

      await expect(
        registry.transferOwnership(productId, ethers.ZeroAddress)
      ).to.be.revertedWith("invalid new owner");
    });

    it("reverts when transferring to the current owner (self-transfer)", async function () {
      const { registry, owner } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-SELF");

      await registry.registerProduct(productId, contentHash);

      await expect(
        registry.transferOwnership(productId, owner.address)
      ).to.be.revertedWith("same owner");
    });

    it("reverts when product does not exist", async function () {
      const { registry, alice } = await deployFixture();
      const { productId } = makeIds("SKU-GHOST");

      await expect(
        registry.transferOwnership(productId, alice.address)
      ).to.be.revertedWith("unknown product");
    });
  });

  // ─── getProduct ───────────────────────────────────────────────────────────

  describe("getProduct", function () {
    it("reverts for an unregistered productId", async function () {
      const { registry } = await deployFixture();
      const { productId } = makeIds("GHOST-SKU");

      await expect(registry.getProduct(productId)).to.be.revertedWith(
        "unknown product"
      );
    });

    it("returns correct registeredAt timestamp", async function () {
      const { registry } = await deployFixture();
      const { productId, contentHash } = makeIds("TS-SKU");

      const txResponse = await registry.registerProduct(productId, contentHash);
      const receipt = await txResponse.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const [, , registeredAt] = await registry.getProduct(productId);
      expect(registeredAt).to.equal(BigInt(block.timestamp));
    });
  });
});
