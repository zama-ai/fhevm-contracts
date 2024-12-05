import { expect } from "chai";
import { ethers } from "hardhat";

import { awaitAllDecryptionResults } from "../asyncDecrypt";
import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { reencryptBalance } from "./ConfidentialERC20.fixture";
import { deployERC20AndConfidentialERC20WrappedFixture } from "./ConfidentialERC20Wrapped.fixture";

describe("ConfidentialERC20Wrapped using ERC20 with 6 decimals", function () {
  before(async function () {
    await initSigners(2);
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const [erc20, confidentialERC20Wrapped] = await deployERC20AndConfidentialERC20WrappedFixture(
      this.signers,
      "Naraggara",
      "NARA",
      6,
    );

    this.erc20 = erc20;
    this.confidentialERC20Wrapped = confidentialERC20Wrapped;
    this.erc20ContractAddress = await erc20.getAddress();
    this.confidentialERC20WrappedAddress = await confidentialERC20Wrapped.getAddress();
    this.instances = await createInstances(this.signers);
  });

  it("name/symbol are automatically set", async function () {
    expect(await this.confidentialERC20Wrapped.name()).to.eq("Confidential Naraggara");
    expect(await this.confidentialERC20Wrapped.symbol()).to.eq("NARAc");
  });

  it("can wrap", async function () {
    const amountToWrap = ethers.parseUnits("100000", 6);

    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();

    // Check balance/totalSupply
    expect(await this.erc20.balanceOf(this.signers.alice)).to.equal(amountToWrap);
    expect(await this.erc20.totalSupply()).to.equal(amountToWrap);

    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.wrap(amountToWrap);
    await tx.wait();

    // Check encrypted balance
    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialERC20Wrapped,
        this.confidentialERC20WrappedAddress,
      ),
    ).to.equal(amountToWrap);
  });

  it("can unwrap", async function () {
    const amountToWrap = ethers.parseUnits("10000", 6);
    const amountToUnwrap = ethers.parseUnits("5000", 6);

    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap);
    await tx.wait();

    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(amountToUnwrap);
    await tx.wait();

    await awaitAllDecryptionResults();

    expect(await this.erc20.balanceOf(this.signers.alice)).to.equal(amountToUnwrap);
    expect(await this.erc20.totalSupply()).to.equal(amountToWrap);

    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialERC20Wrapped,
        this.confidentialERC20WrappedAddress,
      ),
    ).to.equal(amountToWrap - amountToUnwrap);
  });

  it("cannot transfer after unwrap has been called but decryption has not occurred", async function () {
    const amountToWrap = ethers.parseUnits("10000", 6);
    const amountToUnwrap = ethers.parseUnits("5000", 6);
    const transferAmount = ethers.parseUnits("3000", 6);

    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap);
    await tx.wait();

    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(amountToUnwrap);
    await tx.wait();

    const input = this.instances.alice.createEncryptedInput(
      this.confidentialERC20WrappedAddress,
      this.signers.alice.address,
    );
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    await expect(
      this.confidentialERC20Wrapped
        .connect(this.signers.alice)
        [
          "transfer(address,bytes32,bytes)"
        ](this.signers.bob.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof),
    ).to.be.revertedWithCustomError(this.confidentialERC20Wrapped, "CannotTransferOrUnwrap");
  });

  it("cannot call twice unwrap before decryption", async function () {
    const amountToWrap = ethers.parseUnits("10000", 6);
    const amountToUnwrap = ethers.parseUnits("5000", 6);

    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap);
    await tx.wait();

    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(amountToUnwrap);
    await tx.wait();

    await expect(
      this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(amountToUnwrap),
    ).to.be.revertedWithCustomError(this.confidentialERC20Wrapped, "CannotTransferOrUnwrap");
  });

  it("cannot unwrap more than balance", async function () {
    const amountToWrap = ethers.parseUnits("10000", 6);
    const amountToUnwrap = amountToWrap + BigInt("1");

    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(amountToUnwrap);
    await tx.wait();

    await awaitAllDecryptionResults();

    // Verify the balances have not changed
    expect(await this.erc20.balanceOf(this.confidentialERC20WrappedAddress)).to.equal(amountToWrap);
    expect(await this.confidentialERC20Wrapped.totalSupply()).to.equal(amountToWrap);
    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialERC20Wrapped,
        this.confidentialERC20WrappedAddress,
      ),
    ).to.equal(amountToWrap);
  });

  it("transfers work outside of decryption period", async function () {
    const amountToWrap = ethers.parseUnits("10000", 6);
    const amountToUnwrap = ethers.parseUnits("2000", 6);

    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap);
    await tx.wait();

    let transferAmount = ethers.parseUnits("3000", 6);
    let input = this.instances.alice.createEncryptedInput(
      this.confidentialERC20WrappedAddress,
      this.signers.alice.address,
    );
    input.add64(transferAmount);
    let encryptedTransferAmount = await input.encrypt();

    await this.confidentialERC20Wrapped
      .connect(this.signers.alice)
      [
        "transfer(address,bytes32,bytes)"
      ](this.signers.bob.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    tx = await this.confidentialERC20Wrapped.connect(this.signers.bob).unwrap(amountToUnwrap);
    await tx.wait();

    await awaitAllDecryptionResults();

    transferAmount = ethers.parseUnits("1000", 6);
    input = this.instances.bob.createEncryptedInput(this.confidentialERC20WrappedAddress, this.signers.bob.address);
    input.add64(transferAmount);
    encryptedTransferAmount = await input.encrypt();

    await this.confidentialERC20Wrapped
      .connect(this.signers.bob)
      [
        "transfer(address,bytes32,bytes)"
      ](this.signers.alice.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);
  });

  it("amount > 2**64 cannot be wrapped", async function () {
    const amountToWrap = BigInt(2 ** 64);

    // @dev Verify 2**64 - 1 is fine.
    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap - BigInt(1));
    await tx.wait();

    // Unwrap all
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(amountToWrap - BigInt(1));
    await tx.wait();
    await awaitAllDecryptionResults();

    // @dev Verify 2**64 is not fine
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    await expect(
      this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap),
    ).to.be.revertedWithCustomError(this.confidentialERC20Wrapped, "AmountTooHigh");
  });

  it("only gateway can call callback functions", async function () {
    await expect(this.confidentialERC20Wrapped.connect(this.signers.alice).callbackUnwrap(1, false)).to.be.reverted;
  });
});

describe("ConfidentialERC20Wrapped using ERC20 with 18 decimals", function () {
  before(async function () {
    await initSigners(2);
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const [erc20, confidentialERC20Wrapped] = await deployERC20AndConfidentialERC20WrappedFixture(
      this.signers,
      "Naraggara",
      "NARA",
      18,
    );
    this.erc20 = erc20;
    this.confidentialERC20Wrapped = confidentialERC20Wrapped;
    this.erc20ContractAddress = await erc20.getAddress();
    this.confidentialERC20WrappedAddress = await confidentialERC20Wrapped.getAddress();
    this.instances = await createInstances(this.signers);
  });

  it("can wrap", async function () {
    const amountToWrap = "100000";
    const amountToWrap6Decimals = ethers.parseUnits(amountToWrap, 6);
    const amountToWrap18Decimals = ethers.parseUnits(amountToWrap, 18);

    let tx = await this.erc20.mint(amountToWrap18Decimals);
    await tx.wait();

    // Check balance/totalSupply
    expect(await this.erc20.balanceOf(this.signers.alice)).to.equal(amountToWrap18Decimals);
    expect(await this.erc20.totalSupply()).to.equal(amountToWrap18Decimals);

    tx = await this.erc20
      .connect(this.signers.alice)
      .approve(this.confidentialERC20WrappedAddress, amountToWrap18Decimals);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap18Decimals);
    await tx.wait();

    // Check encrypted balance
    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialERC20Wrapped,
        this.confidentialERC20WrappedAddress,
      ),
    ).to.equal(amountToWrap6Decimals);
  });

  it("can unwrap", async function () {
    const amountToWrap = "100000";
    const amountToWrap6Decimals = ethers.parseUnits(amountToWrap, 6);
    const amountToWrap18Decimals = ethers.parseUnits(amountToWrap, 18);
    const amountToUnwrap = "5000";
    const amountToUnwrap6Decimals = ethers.parseUnits(amountToUnwrap, 6);
    const amountToUnwrap18Decimals = ethers.parseUnits(amountToUnwrap, 18);

    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap18Decimals);
    await tx.wait();
    tx = await this.erc20
      .connect(this.signers.alice)
      .approve(this.confidentialERC20WrappedAddress, amountToWrap18Decimals);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap18Decimals);
    await tx.wait();

    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(amountToUnwrap6Decimals);
    await tx.wait();

    await awaitAllDecryptionResults();

    expect(await this.erc20.balanceOf(this.signers.alice)).to.equal(amountToUnwrap18Decimals);
    expect(await this.erc20.totalSupply()).to.equal(amountToWrap18Decimals);

    // Check encrypted balance
    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialERC20Wrapped,
        this.confidentialERC20WrappedAddress,
      ),
    ).to.equal(amountToWrap6Decimals - amountToUnwrap6Decimals);

    // Unwrap all
    tx = await this.confidentialERC20Wrapped.unwrap(amountToWrap6Decimals - amountToUnwrap6Decimals);
    await tx.wait();

    await awaitAllDecryptionResults();

    expect(await this.erc20.balanceOf(this.signers.alice)).to.equal(amountToWrap18Decimals);
  });

  it("amount > 2**64 cannot be wrapped", async function () {
    const amountToWrap = BigInt(2 ** 64) * ethers.parseUnits("1", 12);

    // @dev Verify 2**64 - 1 is fine.
    let tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).wrap(amountToWrap - BigInt(1));
    await tx.wait();

    const totalSupply = await this.confidentialERC20Wrapped.totalSupply();

    // Unwrap all
    tx = await this.confidentialERC20Wrapped.connect(this.signers.alice).unwrap(totalSupply);
    await tx.wait();
    await awaitAllDecryptionResults();

    // @dev Verify 2**64 is not fine
    // @dev There is a bit of loss due to precision issue when the unwrap operation took place.
    tx = await this.erc20.connect(this.signers.alice).mint(amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.alice).transfer(this.signers.bob.address, amountToWrap);
    await tx.wait();
    tx = await this.erc20.connect(this.signers.bob).approve(this.confidentialERC20WrappedAddress, amountToWrap);
    await tx.wait();

    await expect(
      this.confidentialERC20Wrapped.connect(this.signers.bob).wrap(amountToWrap),
    ).to.be.revertedWithCustomError(this.confidentialERC20Wrapped, "AmountTooHigh");
  });
});
