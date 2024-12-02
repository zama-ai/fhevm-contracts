import { expect } from "chai";
import { parseUnits } from "ethers";
import { ethers } from "hardhat";

import { awaitAllDecryptionResults } from "../asyncDecrypt";
import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { reencryptBalance } from "./ConfidentialERC20.fixture";
import { deployConfidentialWETHFixture } from "./ConfidentialWETH.fixture";

describe("ConfidentialWETH", function () {
  before(async function () {
    await initSigners(3);
    this.signers = await getSigners();
    this.instances = await createInstances(this.signers);
  });

  beforeEach(async function () {
    const confidentialWETH = await deployConfidentialWETHFixture(this.signers);
    this.confidentialWETH = confidentialWETH;
    this.confidentialWETHAddress = await confidentialWETH.getAddress();
  });

  it("name/symbol are automatically set, totalSupply = 0", async function () {
    expect(await this.confidentialWETH.name()).to.eq("Encrypted Wrapped Ether");
    expect(await this.confidentialWETH.symbol()).to.eq("eWETH");
    expect(await this.confidentialWETH.totalSupply()).to.eq("0");
  });

  it("can wrap", async function () {
    const amountToWrap = "200";
    const amountToWrap6Decimals = ethers.parseUnits(amountToWrap, 6);
    const amountToWrap18Decimals = ethers.parseUnits(amountToWrap, 18);
    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap18Decimals + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    const tx = await this.confidentialWETH.connect(this.signers.alice).wrap({ value: amountToWrap18Decimals });
    await tx.wait();

    // Check encrypted balance
    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialWETH,
        this.confidentialWETHAddress,
      ),
    ).to.equal(amountToWrap6Decimals);
  });

  it("can unwrap", async function () {
    const amountToWrap = "100000";
    const amountToWrap6Decimals = ethers.parseUnits(amountToWrap, 6);
    const amountToWrap18Decimals = ethers.parseUnits(amountToWrap, 18);
    const amountToUnwrap = "5000";
    const amountToUnwrap6Decimals = ethers.parseUnits(amountToUnwrap, 6);

    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap18Decimals + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    let tx = await this.confidentialWETH.connect(this.signers.alice).wrap({ value: amountToWrap18Decimals });
    await tx.wait();

    tx = await this.confidentialWETH.connect(this.signers.alice).unwrap(amountToUnwrap6Decimals);
    await tx.wait();
    await awaitAllDecryptionResults();

    // Check encrypted balance
    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialWETH,
        this.confidentialWETHAddress,
      ),
    ).to.equal(amountToWrap6Decimals - amountToUnwrap6Decimals);

    // Unwrap all
    tx = await this.confidentialWETH.unwrap(amountToWrap6Decimals - amountToUnwrap6Decimals);
    await tx.wait();
    await awaitAllDecryptionResults();

    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialWETH,
        this.confidentialWETHAddress,
      ),
    ).to.equal(BigInt("0"));
  });

  it("amount > 2**64 cannot be wrapped", async function () {
    const amountToWrap = BigInt(2 ** 64) * ethers.parseUnits("1", 12);
    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    // @dev Verify 2**64 - 1 is fine.
    let tx = await this.confidentialWETH.connect(this.signers.alice).wrap({ value: amountToWrap - BigInt(1) });
    await tx.wait();

    const totalSupply = await this.confidentialWETH.totalSupply();

    // Unwrap all
    tx = await this.confidentialWETH.connect(this.signers.alice).unwrap(totalSupply);
    await tx.wait();
    await awaitAllDecryptionResults();

    // @dev Verify 2**64 is not fine
    // @dev There is a bit of loss due to precision issue when the unwrap operation took place.
    await ethers.provider.send("hardhat_setBalance", [this.signers.bob.address, "0x" + amountToMint.toString(16)]);

    await expect(
      this.confidentialWETH.connect(this.signers.bob).wrap({ value: amountToWrap }),
    ).to.be.revertedWithCustomError(this.confidentialWETH, "AmountTooHigh");
  });

  it("cannot transfer after unwrap has been called but decryption has not occurred", async function () {
    const amountToWrap = ethers.parseUnits("10000", 18);
    const amountToUnwrap = ethers.parseUnits("5000", 6);
    const transferAmount = ethers.parseUnits("3000", 6);

    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    let tx = await this.confidentialWETH.connect(this.signers.alice).wrap({ value: amountToWrap });
    await tx.wait();

    tx = await this.confidentialWETH.connect(this.signers.alice).unwrap(amountToUnwrap);
    await tx.wait();

    const input = this.instances.alice.createEncryptedInput(this.confidentialWETHAddress, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    await expect(
      this.confidentialWETH
        .connect(this.signers.alice)
        [
          "transfer(address,bytes32,bytes)"
        ](this.signers.bob.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof),
    ).to.be.revertedWithCustomError(this.confidentialWETH, "CannotTransferOrUnwrap");
  });

  it("cannot call twice unwrap before decryption", async function () {
    const amountToWrap = ethers.parseUnits("10000", 18);
    const amountToUnwrap = ethers.parseUnits("5000", 6);
    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    let tx = await this.confidentialWETH.connect(this.signers.alice).wrap({ value: amountToWrap });
    await tx.wait();

    tx = await this.confidentialWETH.connect(this.signers.alice).unwrap(amountToUnwrap);
    await tx.wait();

    await expect(
      this.confidentialWETH.connect(this.signers.alice).unwrap(amountToUnwrap),
    ).to.be.revertedWithCustomError(this.confidentialWETH, "CannotTransferOrUnwrap");
  });

  it("cannot unwrap more than balance", async function () {
    const amountToWrap = "100000";
    const amountToWrap6Decimals = ethers.parseUnits(amountToWrap, 6);
    const amountToWrap18Decimals = ethers.parseUnits(amountToWrap, 18);
    const amountToUnwrap6Decimals = amountToWrap6Decimals + BigInt(1);

    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap18Decimals + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    let tx = await this.confidentialWETH.connect(this.signers.alice).wrap({ value: amountToWrap18Decimals });
    await tx.wait();
    tx = await this.confidentialWETH.connect(this.signers.alice).unwrap(amountToUnwrap6Decimals);
    await tx.wait();
    await awaitAllDecryptionResults();

    // Verify the balances have not changed
    expect(await ethers.provider.getBalance(this.confidentialWETHAddress)).to.equal(amountToWrap18Decimals);
    expect(await this.confidentialWETH.totalSupply()).to.equal(amountToWrap6Decimals);
    expect(
      await reencryptBalance(
        this.signers,
        this.instances,
        "alice",
        this.confidentialWETH,
        this.confidentialWETHAddress,
      ),
    ).to.equal(amountToWrap6Decimals);
  });

  it("transfers work outside of decryption period", async function () {
    const amountToWrap = ethers.parseUnits("10000", 18);
    const amountToUnwrap = ethers.parseUnits("2000", 6);
    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    let tx = await this.confidentialWETH.connect(this.signers.alice).wrap({ value: amountToWrap });
    await tx.wait();

    let transferAmount = ethers.parseUnits("3000", 6);
    let input = this.instances.alice.createEncryptedInput(this.confidentialWETHAddress, this.signers.alice.address);
    input.add64(transferAmount);
    let encryptedTransferAmount = await input.encrypt();

    await this.confidentialWETH
      .connect(this.signers.alice)
      [
        "transfer(address,bytes32,bytes)"
      ](this.signers.bob.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    tx = await this.confidentialWETH.connect(this.signers.bob).unwrap(amountToUnwrap);
    await tx.wait();
    await awaitAllDecryptionResults();

    transferAmount = ethers.parseUnits("1000", 6);
    input = this.instances.bob.createEncryptedInput(this.confidentialWETHAddress, this.signers.bob.address);
    input.add64(transferAmount);
    encryptedTransferAmount = await input.encrypt();

    await this.confidentialWETH
      .connect(this.signers.bob)
      [
        "transfer(address,bytes32,bytes)"
      ](this.signers.alice.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);
  });

  it("only gateway can call callback functions", async function () {
    await expect(this.confidentialWETH.connect(this.signers.alice).callbackUnwrap(1, false)).to.be.reverted;
  });
});
