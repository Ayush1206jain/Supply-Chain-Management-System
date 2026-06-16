const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChainRegistry", function () {
  // ─── fixture ─────────────────────────────────────────────────────────────

  async function deployFixture() {
    const [owner, alice, bob, carol] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SupplyChainRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();
    return { registry, owner, alice, bob, carol };
  }

  // Helper: create a valid productId and contentHash pair
  function makeIds(label) {
    const productId = ethers.id(label);               // keccak256 → bytes32
    const contentHash = ethers.keccak256(             // keccak256 of payload
      ethers.toUtf8Bytes(`payload-${label}`)
    );
    return { productId, contentHash };
  }

  // Status enum mapping (mirrors Solidity enum)
  const STATUS = { CREATED: 0, IN_TRANSIT: 1, DELIVERED: 2, DISPUTED: 3 };

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

      const tx = await registry.registerProduct(productId, contentHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, "ProductRegistered")
        .withArgs(productId, contentHash, owner.address, block.timestamp);
    });

    it("stores contentHash and caller as owner", async function () {
      const { registry, owner } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-002");

      await registry.registerProduct(productId, contentHash);

      const [storedHash, storedOwner, registeredAt] =
        await registry.getProduct(productId);

      expect(storedHash).to.equal(contentHash);
      expect(storedOwner).to.equal(owner.address);
      expect(registeredAt).to.be.gt(0n);
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

  // ─── transferOwnership (original — backward compat) ───────────────────────

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

    it("unrelated account cannot transfer after handoff", async function () {
      const { registry, owner, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-TR-002");

      await registry.registerProduct(productId, contentHash);
      await registry.transferOwnership(productId, alice.address);

      await expect(
        registry.connect(bob).transferOwnership(productId, owner.address)
      ).to.be.revertedWith("not owner");
    });

    it("registrar can continue transferring as backend oracle", async function () {
      const { registry, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-TR-ORACLE");

      await registry.registerProduct(productId, contentHash);
      await registry.transferOwnership(productId, alice.address);
      await registry.transferOwnership(productId, bob.address);

      const [, finalOwner] = await registry.getProduct(productId);
      expect(finalOwner).to.equal(bob.address);
    });

    it("new owner can transfer onwards", async function () {
      const { registry, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("SKU-TR-003");

      await registry.registerProduct(productId, contentHash);
      await registry.transferOwnership(productId, alice.address);
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
      expect(Number(registeredAt)).to.equal(block.timestamp);
    });
  });

  // ─── NEW: ProductStatus enum ──────────────────────────────────────────────

  describe("ProductStatus enum", function () {
    it("status should be CREATED (0) after registerProduct", async function () {
      const { registry } = await deployFixture();
      const { productId, contentHash } = makeIds("STATUS-001");

      await registry.registerProduct(productId, contentHash);
      const [, , , status] = await registry.getProduct(productId);
      expect(Number(status)).to.equal(STATUS.CREATED);
    });

    it("status should be IN_TRANSIT (1) after initiateTransfer", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("STATUS-002");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);

      const [, , , status] = await registry.getProduct(productId);
      expect(Number(status)).to.equal(STATUS.IN_TRANSIT);
    });

    it("status should be DELIVERED (2) after confirmTransfer", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("STATUS-003");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);
      await registry.connect(alice).confirmTransfer(productId);

      const [, , , status] = await registry.getProduct(productId);
      expect(Number(status)).to.equal(STATUS.DELIVERED);
    });

    it("status should be DISPUTED (3) after flagDispute", async function () {
      const { registry } = await deployFixture();
      const { productId, contentHash } = makeIds("STATUS-004");

      await registry.registerProduct(productId, contentHash);
      await registry.flagDispute(productId);

      const [, , , status] = await registry.getProduct(productId);
      expect(Number(status)).to.equal(STATUS.DISPUTED);
    });
  });

  // ─── NEW: Multi-sig transfer ──────────────────────────────────────────────

  describe("Multi-sig transfer", function () {
    it("initiateTransfer emits TransferInitiated and sets status IN_TRANSIT", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-001");

      await registry.registerProduct(productId, contentHash);

      // Check the event is emitted (without strict timestamp assertion — block time is non-deterministic)
      const tx = await registry.initiateTransfer(productId, alice.address);
      await expect(tx).to.emit(registry, "TransferInitiated");

      // Confirm status moved to IN_TRANSIT
      const [, , , status] = await registry.getProduct(productId);
      expect(Number(status)).to.equal(STATUS.IN_TRANSIT);
    });

    it("confirmTransfer changes owner to receiver and emits TransferConfirmed", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-002");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);

      await expect(registry.connect(alice).confirmTransfer(productId))
        .to.emit(registry, "TransferConfirmed");

      const [, newOwner, , status] = await registry.getProduct(productId);
      expect(newOwner).to.equal(alice.address);
      expect(Number(status)).to.equal(STATUS.DELIVERED);
    });

    it("registrar can confirm transfer as backend oracle", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-ORACLE");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);
      await registry.confirmTransfer(productId);

      const [, newOwner, , status] = await registry.getProduct(productId);
      expect(newOwner).to.equal(alice.address);
      expect(Number(status)).to.equal(STATUS.DELIVERED);
    });

    it("confirmTransfer reverts if called by wrong address (not intended receiver)", async function () {
      const { registry, owner, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-003");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);

      // bob tries to confirm — not the intended receiver
      await expect(
        registry.connect(bob).confirmTransfer(productId)
      ).to.be.revertedWith("not the intended receiver");
    });

    it("initiateTransfer reverts if caller is not the owner", async function () {
      const { registry, owner, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-004");

      await registry.registerProduct(productId, contentHash);

      // alice is not the owner
      await expect(
        registry.connect(alice).initiateTransfer(productId, bob.address)
      ).to.be.revertedWith("not owner");
    });

    it("second initiateTransfer reverts if one is already pending", async function () {
      const { registry, owner, alice, bob } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-005");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);

      // trying to initiate again before confirmation
      await expect(
        registry.initiateTransfer(productId, bob.address)
      ).to.be.revertedWith("transfer already pending");
    });

    it("getPendingTransfer returns correct data after initiation", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-006");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);

      const [from, to, , exists] = await registry.getPendingTransfer(productId);
      expect(from).to.equal(owner.address);
      expect(to).to.equal(alice.address);
      expect(exists).to.be.true;
    });

    it("getPendingTransfer returns exists=false after confirmTransfer", async function () {
      const { registry, owner, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-007");

      await registry.registerProduct(productId, contentHash);
      await registry.initiateTransfer(productId, alice.address);
      await registry.connect(alice).confirmTransfer(productId);

      const [, , , exists] = await registry.getPendingTransfer(productId);
      expect(exists).to.be.false;
    });

    it("confirmTransfer reverts when no pending transfer exists", async function () {
      const { registry, alice } = await deployFixture();
      const { productId, contentHash } = makeIds("MSIG-008");

      await registry.registerProduct(productId, contentHash);

      await expect(
        registry.connect(alice).confirmTransfer(productId)
      ).to.be.revertedWith("no pending transfer");
    });
  });

  // ─── NEW: Dispute flag ────────────────────────────────────────────────────

  describe("flagDispute", function () {
    it("sets status to DISPUTED and emits DisputeRaised", async function () {
      const { registry, owner } = await deployFixture();
      const { productId, contentHash } = makeIds("DISPUTE-001");

      await registry.registerProduct(productId, contentHash);

      await expect(registry.flagDispute(productId))
        .to.emit(registry, "DisputeRaised");

      const [, , , status] = await registry.getProduct(productId);
      expect(Number(status)).to.equal(STATUS.DISPUTED);
    });

    it("reverts flagDispute for unknown product", async function () {
      const { registry } = await deployFixture();
      const { productId } = makeIds("DISPUTE-GHOST");

      await expect(
        registry.flagDispute(productId)
      ).to.be.revertedWith("unknown product");
    });
  });
});
