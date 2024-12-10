import { expect } from "chai";
import { ethers, network } from "hardhat";

import { getSigners, initSigners } from "../signers";
import { deployTimelockFixture } from "./ConfidentialGovernorAlpha.fixture";

describe("CompoundTimelock", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    this.timelock = await deployTimelockFixture(this.signers.alice, this.signers.alice.address);
  });

  it("non-timelock account could not call setPendingAdmin", async function () {
    await expect(this.timelock.setPendingAdmin(this.signers.bob)).to.be.revertedWithCustomError(
      this.timelock,
      "SenderIsNotTimelock",
    );
  });

  it("non-timelock account could not call setDelay", async function () {
    await expect(this.timelock.setDelay(60 * 60 * 24 * 3)).to.be.revertedWithCustomError(
      this.timelock,
      "SenderIsNotTimelock",
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
      ).to.be.revertedWithCustomError(this.timelock, "ExecutionReverted");
      await expect(
        this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData2, expiry),
      ).to.be.revertedWithCustomError(this.timelock, "ExecutionReverted");
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

    let tx = await this.timelock.queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
    await tx.wait();

    await expect(
      this.timelock.connect(this.signers.bob).cancelTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
    ).to.be.revertedWithCustomError(this.timelock, "SenderIsNotAdmin");

    tx = await this.timelock.cancelTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
    await tx.wait();

    if (network.name === "hardhat") {
      // hardhat cheatcodes are available only in mocked mode
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      await expect(
        this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
      ).to.be.revertedWithCustomError(this.timelock, "TransactionNotQueued");
    }
  });

  it("only admin could queue transaction, only if it satisfies the delay", async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 60 * 60 * 24 * 2 + 60;
    const expiryTooShort = block!.timestamp + 60 * 60 * 24 * 1 + 60;
    const timeLockAdd = await this.timelock.getAddress();
    const callData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [60 * 60 * 24 * 20]); // OK

    // Bob is not the admin.
    await expect(
      this.timelock.connect(this.signers.bob).queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
    ).to.be.revertedWithCustomError(this.timelock, "SenderIsNotTimelock");

    // The expiry is too short.
    await expect(
      this.timelock
        .connect(this.signers.alice)
        .queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiryTooShort),
    ).to.be.revertedWithCustomError(this.timelock, "TransactionTooEarlyForQueuing");

    const tx = await this.timelock
      .connect(this.signers.alice)
      .queueTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry);
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
      ).to.be.revertedWithCustomError(this.timelock, "SenderIsNotAdmin");

      const idSnapshot = await ethers.provider.send("evm_snapshot");
      await ethers.provider.send("evm_increaseTime", ["0xffffff"]);
      await expect(
        this.timelock.executeTransaction(timeLockAdd, 0, "setDelay(uint256)", callData, expiry),
      ).to.be.revertedWithCustomError(this.timelock, "TransactionTooLateForExecution");

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

  it("could not deploy timelock contract if delay is below 2 days or above 31 days", async function () {
    const timelockFactory = await ethers.getContractFactory("CompoundTimelock");

    if (network.name === "hardhat") {
      await expect(
        timelockFactory.connect(this.signers.alice).deploy(this.signers.alice.address, 60 * 60 * 24 * 1),
      ).to.be.revertedWithCustomError(this.timelock, "DelayBelowMinimumDelay");

      await expect(
        timelockFactory.connect(this.signers.alice).deploy(this.signers.alice.address, 60 * 60 * 24 * 31),
      ).to.be.revertedWithCustomError(this.timelock, "DelayAboveMaximumDelay");
    }
  });
});
