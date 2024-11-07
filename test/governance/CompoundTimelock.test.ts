import { expect } from "chai";
import { ethers, network } from "hardhat";

import { getSigners, initSigners } from "../signers";
import { deployTimelockFixture } from "./GovernorAlphaZama.fixture";

describe("CompoundTimelock", function () {
  before(async function () {
    await initSigners(3);
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    this.timelock = await deployTimelockFixture(this.signers.alice.address);
  });

  it("non-timelock account could not call setPendingAdmin", async function () {
    await expect(this.timelock.setPendingAdmin(this.signers.bob)).to.be.revertedWith(
      "Timelock::setPendingAdmin: Call must come from Timelock.",
    );
  });

  it("non-timelock account could not call setDelay", async function () {
    await expect(this.timelock.setDelay(60 * 60 * 24 * 3)).to.be.revertedWith(
      "Timelock::setDelay: Call must come from Timelock.",
    );
  });

  it("setDelay could only be called with a delay between MINIMUM_DELAY and MAXIMUM_DELAY", async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 60 * 60 * 24 * 2 + 60;
    const timeLockAdd = await this.timelock.getAddress();
    const callData1 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 1]); // below MINIMUM_DELAY
    const callData2 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 40]); // above MAXIMUM_DELAY
    const callData3 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 20]); // OK

    const tx1 = await this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData1, expiry);
    await tx1.wait();
    const tx2 = await this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData2, expiry);
    await tx2.wait();
    const tx3 = await this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData3, expiry);
    await tx3.wait();

    if (network.name === "hardhat") {
      // hardhat cheatcodes are available only in mocked mode
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      await expect(
        this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData1, expiry),
      ).to.be.revertedWith("Timelock::executeTransaction: Transaction execution reverted.");
      await expect(
        this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData2, expiry),
      ).to.be.revertedWith("Timelock::executeTransaction: Transaction execution reverted.");
      await this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData3, expiry);
      expect(await this.timelock.delay()).to.equal(60 * 60 * 24 * 20);
    }
  });

  it("only admin could cancel queued transaction", async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 60 * 60 * 24 * 2 + 60;
    const timeLockAdd = await this.timelock.getAddress();
    const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 20]); // OK

    const tx = await this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
    await tx.wait();

    await expect(
      this.timelock.connect(this.signers.bob).cancelTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
    ).to.throw;

    const tx2 = await this.timelock.cancelTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
    await tx2.wait();

    if (network.name === "hardhat") {
      // hardhat cheatcodes are available only in mocked mode
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      await expect(
        this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
      ).to.be.revertedWith("Timelock::executeTransaction: Transaction hasn't been queued.");
    }
  });

  it("only admin could queue transaction, only if it satisfies the delay", async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 60 * 60 * 24 * 2 + 60;
    const expiryTooShort = block!.timestamp + 60 * 60 * 24 * 1 + 60;
    const timeLockAdd = await this.timelock.getAddress();
    const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 20]); // OK

    await expect(
      this.timelock.connect(this.signers.bob).queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
    ).to.throw;

    await expect(this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiryTooShort)).to
      .throw;

    const tx = await this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
    await tx.wait();
  });

  it("only admin could execute transaction, only before grace period", async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 60 * 60 * 24 * 2 + 60;
    const timeLockAdd = await this.timelock.getAddress();
    const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 20]); // OK
    const tx = await this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
    await tx.wait();

    if (network.name === "hardhat") {
      // hardhat cheatcodes are available only in mocked mode
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      await expect(
        this.timelock
          .connect(this.signers.bob)
          .executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
      ).to.be.revertedWith("Timelock::executeTransaction: Call must come from admin.");

      const idSnapshot = await ethers.provider.send("evm_snapshot");
      await ethers.provider.send("evm_increaseTime", ["0xffffff"]);
      await expect(
        this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
      ).to.be.revertedWith("Timelock::executeTransaction: Transaction is stale.");

      await ethers.provider.send("evm_revert", [idSnapshot]); // roll back time to previous snapshot, before the grace period
      const tx2 = await this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
      await tx2.wait();
      expect(await this.timelock.delay()).to.equal(60 * 60 * 24 * 20);
    }
  });

  it("if signature string is empty, calldata must append the signature", async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 60 * 60 * 24 * 2 + 60;
    const timeLockAdd = await this.timelock.getAddress();
    const functionSig = ethers.FunctionFragment.getSelector("setDelay", ["uint256"]);
    const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 20]); // OK

    const tx = await this.timelock.queueTransaction(timeLockAdd, 0, "", functionSig + callData.slice(2), expiry);
    await tx.wait();

    if (network.name === "hardhat") {
      // hardhat cheatcodes are available only in mocked mode
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      const tx2 = await this.timelock.executeTransaction(timeLockAdd, 0, "", functionSig + callData.slice(2), expiry);
      await tx2.wait();
      expect(await this.timelock.delay()).to.equal(60 * 60 * 24 * 20);
    }
  });
});
