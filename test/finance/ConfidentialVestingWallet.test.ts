import { expect } from "chai";
import { parseUnits } from "ethers";
import { ethers } from "hardhat";

import { deployConfidentialERC20Fixture, reencryptBalance } from "../confidentialERC20/ConfidentialERC20.fixture";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";
import { deployConfidentialVestingWalletFixture, reencryptReleased } from "./ConfidentialVestingWallet.fixture";

describe("ConfidentialVestingWallet", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    this.instance = await createInstance();
  });

  beforeEach(async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);

    this.beneficiary = this.signers.bob;
    this.beneficiaryAddress = this.signers.bob.address;

    const contractConfidentialERC20 = await deployConfidentialERC20Fixture(
      this.signers.alice,
      "Naraggara",
      "NARA",
      this.signers.alice.address,
    );
    this.confidentialERC20Address = await contractConfidentialERC20.getAddress();
    this.confidentialERC20 = contractConfidentialERC20;
    this.startTimestamp = BigInt(block!.timestamp + 3600);
    this.duration = BigInt(36_000); // 36,000 seconds

    const contractConfidentialVestingWallet = await deployConfidentialVestingWalletFixture(
      this.signers.alice,
      this.beneficiaryAddress,
      this.startTimestamp,
      this.duration,
    );

    this.confidentialVestingWallet = contractConfidentialVestingWallet;
    this.confidentialVestingWalletAddress = await contractConfidentialVestingWallet.getAddress();
  });

  it("post-deployment state", async function () {
    expect(await this.confidentialVestingWallet.BENEFICIARY()).to.equal(this.beneficiaryAddress);
    expect(await this.confidentialVestingWallet.DURATION()).to.equal(this.duration);
    expect(await this.confidentialVestingWallet.END_TIMESTAMP()).to.be.eq(this.startTimestamp + this.duration);
    expect(await this.confidentialVestingWallet.START_TIMESTAMP()).to.be.eq(this.startTimestamp);
  });

  it("can release", async function () {
    // 10M
    const amount = parseUnits("10000000", 6);

    let tx = await this.confidentialERC20.connect(this.signers.alice).mint(this.signers.alice, amount);
    await tx.wait();

    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(amount);
    const encryptedTransferAmount = await input.encrypt();

    tx = await this.confidentialERC20
      .connect(this.signers.alice)
      [
        "transfer(address,bytes32,bytes)"
      ](this.confidentialVestingWalletAddress, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    await tx.wait();

    let nextTimestamp = this.startTimestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp.toString()]);

    tx = await this.confidentialVestingWallet.connect(this.beneficiary).release(this.confidentialERC20Address);
    await expect(tx)
      .to.emit(this.confidentialVestingWallet, "ConfidentialERC20Released")
      .withArgs(this.confidentialERC20Address);

    // It should be equal to 0 because the vesting has not started.
    expect(
      await reencryptReleased(
        this.beneficiary,
        this.instance,
        this.confidentialERC20Address,
        this.confidentialVestingWallet,
        this.confidentialVestingWalletAddress,
      ),
    ).to.be.eq(0n);

    nextTimestamp = this.startTimestamp + this.duration / BigInt(4);
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp.toString()]);

    tx = await this.confidentialVestingWallet.connect(this.beneficiary).release(this.confidentialERC20Address);
    await tx.wait();

    // It should be equal to 1/4 of the amount vested.
    expect(
      await reencryptReleased(
        this.beneficiary,
        this.instance,
        this.confidentialERC20Address,
        this.confidentialVestingWallet,
        this.confidentialVestingWalletAddress,
      ),
    ).to.be.eq(BigInt(amount) / BigInt(4));

    expect(
      await reencryptBalance(this.beneficiary, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.be.eq(BigInt(amount) / BigInt(4));

    nextTimestamp = this.startTimestamp + this.duration / BigInt(2);
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp.toString()]);

    tx = await this.confidentialVestingWallet.connect(this.beneficiary).release(this.confidentialERC20Address);
    await tx.wait();

    // It should be equal to 1/4 of the amount vested since 1/4 was already collected.
    expect(
      await reencryptReleased(
        this.beneficiary,
        this.instance,
        this.confidentialERC20Address,
        this.confidentialVestingWallet,
        this.confidentialVestingWalletAddress,
      ),
    ).to.be.eq(BigInt(amount) / BigInt(2));

    expect(
      await reencryptBalance(this.beneficiary, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.be.eq(BigInt(amount) / BigInt(2));

    nextTimestamp = this.startTimestamp + this.duration;
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp.toString()]);

    tx = await this.confidentialVestingWallet.connect(this.beneficiary).release(this.confidentialERC20Address);
    await tx.wait();

    // It should be equal to 1/2 of the amount vested since 2/4 was already collected.
    expect(
      await reencryptReleased(
        this.beneficiary,
        this.instance,
        this.confidentialERC20Address,
        this.confidentialVestingWallet,
        this.confidentialVestingWalletAddress,
      ),
    ).to.be.eq(BigInt(amount));

    expect(
      await reencryptBalance(this.beneficiary, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.be.eq(BigInt(amount));
  });
});
