import { expect } from "chai";

import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";
import { reencryptAllowance, reencryptBalance } from "./ConfidentialERC20.fixture";
import { checkErrorCode, deployConfidentialERC20WithErrorsFixture } from "./ConfidentialERC20WithErrors.fixture";

describe("ConfidentialERC20WithErrors", function () {
  // @dev The placeholder is type(uint256).max --> 2**256 - 1.
  const PLACEHOLDER = 2n ** 256n - 1n;

  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    this.instance = await createInstance();
  });

  beforeEach(async function () {
    const contract = await deployConfidentialERC20WithErrorsFixture(
      this.signers.alice,
      "Naraggara",
      "NARA",
      await this.signers.alice.getAddress(),
    );
    this.confidentialERC20Address = await contract.getAddress();
    this.confidentialERC20 = contract;
  });

  it("post-deployment state", async function () {
    expect(await this.confidentialERC20.totalSupply()).to.equal(0);
    expect(await this.confidentialERC20.name()).to.equal("Naraggara");
    expect(await this.confidentialERC20.symbol()).to.equal("NARA");
    expect(await this.confidentialERC20.decimals()).to.be.eq(BigInt(6));
  });

  it("should mint the contract", async function () {
    const mintAmount = 1000;
    const tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await expect(tx).to.emit(this.confidentialERC20, "Mint").withArgs(this.signers.alice, mintAmount);

    expect(
      await reencryptBalance(this.signers.alice, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(mintAmount);

    expect(await this.confidentialERC20.totalSupply()).to.equal(mintAmount);
  });

  it("should transfer tokens between two users", async function () {
    const mintAmount = 10_000;
    const transferAmount = 1337;
    const expectedTransferId = 0n;

    let tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    tx = await this.confidentialERC20
      .connect(this.signers.alice)
      [
        "transfer(address,bytes32,bytes)"
      ](this.signers.bob.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    await expect(tx)
      .to.emit(this.confidentialERC20, "Transfer")
      .withArgs(this.signers.alice, this.signers.bob, expectedTransferId);

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers.alice, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(mintAmount - transferAmount);

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers.bob, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(transferAmount);

    // Check the error code matches no error
    expect(
      await checkErrorCode(
        this.signers.alice,
        this.instance,
        expectedTransferId,
        this.confidentialERC20,
        this.confidentialERC20Address,
      ),
    ).to.equal("NO_ERROR");

    // Check that both the from/to address can read the error code
    expect(
      await checkErrorCode(
        this.signers.bob,
        this.instance,
        expectedTransferId,
        this.confidentialERC20,
        this.confidentialERC20Address,
      ),
    ).to.equal("NO_ERROR");
  });

  it("should not transfer tokens between two users if transfer amount is higher than balance", async function () {
    // @dev There is no transfer done since the mint amount is smaller than the transfer
    //      amount.
    const mintAmount = 1000;
    const transferAmount = 1337;
    const expectedTransferId = 0n;

    let tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    tx = await this.confidentialERC20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    await expect(tx)
      .to.emit(this.confidentialERC20, "Transfer")
      .withArgs(this.signers.alice, this.signers.bob, expectedTransferId);

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers.alice, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(mintAmount);

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers.bob, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(0);

    // Check that the error code matches if balance is not sufficient
    expect(
      await checkErrorCode(
        this.signers.bob,
        this.instance,
        expectedTransferId,
        this.confidentialERC20,
        this.confidentialERC20Address,
      ),
    ).to.equal("UNSUFFICIENT_BALANCE");
  });

  it("should be able to transferFrom only if allowance is sufficient", async function () {
    // @dev There is no transfer done since the mint amount is smaller than the transfer
    //      amount.
    const mintAmount = 10_000;
    const transferAmount = 1337;

    let tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const inputAlice = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    inputAlice.add64(transferAmount);
    const encryptedAllowanceAmount = await inputAlice.encrypt();

    tx = await this.confidentialERC20["approve(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedAllowanceAmount.handles[0],
      encryptedAllowanceAmount.inputProof,
    );

    await expect(tx)
      .to.emit(this.confidentialERC20, "Approval")
      .withArgs(this.signers.alice, this.signers.bob, PLACEHOLDER);

    // @dev The allowance amount is set to be equal to the transfer amount.
    expect(
      await reencryptAllowance(
        this.signers.alice,
        this.signers.bob,
        this.instance,
        this.confidentialERC20,
        this.confidentialERC20Address,
      ),
    ).to.equal(transferAmount);

    const expectedTransferId1 = 0n;

    const inputBob1 = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.bob.address);
    inputBob1.add64(transferAmount + 1); // above allowance so next tx should actually not send any token
    const encryptedTransferAmount = await inputBob1.encrypt();

    const tx2 = await this.confidentialERC20
      .connect(this.signers.bob)
      [
        "transferFrom(address,address,bytes32,bytes)"
      ](this.signers.alice.address, this.signers.bob.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    await expect(tx2)
      .to.emit(this.confidentialERC20, "Transfer")
      .withArgs(this.signers.alice, this.signers.bob, expectedTransferId1);

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers.alice, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(mintAmount); // check that transfer did not happen, as expected

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers.bob, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(0); // check that transfer did not happen, as expected

    // Check that the error code matches if approval is not sufficient
    expect(
      await checkErrorCode(
        this.signers.bob,
        this.instance,
        expectedTransferId1,
        this.confidentialERC20,
        this.confidentialERC20Address,
      ),
    ).to.equal("UNSUFFICIENT_APPROVAL");

    const expectedTransferId2 = 1n;

    const inputBob2 = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.bob.address);
    inputBob2.add64(transferAmount); // below allowance so next tx should send token
    const encryptedTransferAmount2 = await inputBob2.encrypt();

    const tx3 = await await this.confidentialERC20
      .connect(this.signers.bob)
      [
        "transferFrom(address,address,bytes32,bytes)"
      ](this.signers.alice.address, this.signers.bob.address, encryptedTransferAmount2.handles[0], encryptedTransferAmount2.inputProof);

    await expect(tx3)
      .to.emit(this.confidentialERC20, "Transfer")
      .withArgs(this.signers.alice, this.signers.bob, expectedTransferId2);

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers.alice, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(mintAmount - transferAmount); // check that transfer did happen this time

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers.bob, this.instance, this.confidentialERC20, this.confidentialERC20Address),
    ).to.equal(transferAmount); // check that transfer did happen this time

    // Verify Alice's allowance is 0
    expect(
      await reencryptAllowance(
        this.signers.alice,
        this.signers.bob,
        this.instance,
        this.confidentialERC20,
        this.confidentialERC20Address,
      ),
    ).to.equal(0);

    // Check that the error code matches if there is no error
    expect(
      await checkErrorCode(
        this.signers.bob,
        this.instance,
        expectedTransferId2,
        this.confidentialERC20,
        this.confidentialERC20Address,
      ),
    ).to.equal("NO_ERROR");
  });

  it("should not be able to read the allowance if not spender/owner after initialization", async function () {
    const amount = 10_000;

    const inputAlice = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    inputAlice.add64(amount);
    const encryptedAllowanceAmount = await inputAlice.encrypt();

    const tx = await this.confidentialERC20
      .connect(this.signers.alice)
      [
        "approve(address,bytes32,bytes)"
      ](this.signers.bob.address, encryptedAllowanceAmount.handles[0], encryptedAllowanceAmount.inputProof);

    await tx.wait();

    const allowanceHandleAlice = await this.confidentialERC20.allowance(this.signers.alice, this.signers.bob);

    const { publicKey: publicKeyCarol, privateKey: privateKeyCarol } = await this.instance.generateKeypair();
    const eip712Carol = this.instance.createEIP712(publicKeyCarol, this.confidentialERC20Address);
    const signatureCarol = await this.signers.carol.signTypedData(
      eip712Carol.domain,
      { Reencrypt: eip712Carol.types.Reencrypt },
      eip712Carol.message,
    );

    await expect(
      this.instance.reencrypt(
        allowanceHandleAlice,
        privateKeyCarol,
        publicKeyCarol,
        signatureCarol.replace("0x", ""),
        this.confidentialERC20Address,
        this.signers.carol.address,
      ),
    ).to.be.rejectedWith("User is not authorized to reencrypt this handle!");
  });

  it("should not be able to read the balance if not user after initialization", async function () {
    // Mint is used to initialize the balanceOf(alice)
    const amount = 10_000;
    const tx = await this.confidentialERC20.connect(this.signers.alice).mint(amount);
    await tx.wait();

    const balanceHandleAlice = await this.confidentialERC20.balanceOf(this.signers.alice);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = await this.instance.generateKeypair();
    const eip712Bob = this.instance.createEIP712(publicKeyBob, this.confidentialERC20Address);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );

    await expect(
      this.instance.reencrypt(
        balanceHandleAlice,
        privateKeyBob,
        publicKeyBob,
        signatureBob.replace("0x", ""),
        this.confidentialERC20Address,
        this.signers.bob.address,
      ),
    ).to.be.rejectedWith("User is not authorized to reencrypt this handle!");
  });

  it("spender cannot be null address", async function () {
    const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
    const mintAmount = 100_000;
    const transferAmount = 50_000;
    const tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    await expect(
      this.confidentialERC20
        .connect(this.signers.alice)
        [
          "approve(address,bytes32,bytes)"
        ](NULL_ADDRESS, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof),
    ).to.be.revertedWithCustomError(this.confidentialERC20, "ERC20InvalidSpender");
  });

  it("receiver cannot be null address", async function () {
    const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
    const mintAmount = 100_000;
    const transferAmount = 50_000;
    const tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    await expect(
      this.confidentialERC20
        .connect(this.signers.alice)
        [
          "transfer(address,bytes32,bytes)"
        ](NULL_ADDRESS, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof),
    ).to.be.revertedWithCustomError(this.confidentialERC20, "ERC20InvalidReceiver");
  });

  it("sender who is not allowed cannot transfer using a handle from another account", async function () {
    const mintAmount = 100_000;
    const transferAmount = 50_000;
    let tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    tx = await this.confidentialERC20
      .connect(this.signers.alice)
      [
        "transfer(address,bytes32,bytes)"
      ](this.signers.carol.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    await tx.wait();

    const balanceHandleAlice = await this.confidentialERC20.balanceOf(this.signers.alice.address);

    await expect(
      this.confidentialERC20.connect(this.signers.bob).transfer(this.signers.carol.address, balanceHandleAlice),
    ).to.be.revertedWithCustomError(this.confidentialERC20, "TFHESenderNotAllowed");
  });

  it("sender who is not allowed cannot transferFrom using a handle from another account", async function () {
    const mintAmount = 100_000;
    const transferAmount = 50_000;

    let tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    let input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(mintAmount);
    const encryptedAllowanceAmount = await input.encrypt();

    tx = await this.confidentialERC20
      .connect(this.signers.alice)
      [
        "approve(address,bytes32,bytes)"
      ](this.signers.carol.address, encryptedAllowanceAmount.handles[0], encryptedAllowanceAmount.inputProof);

    input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.carol.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    tx = await this.confidentialERC20
      .connect(this.signers.carol)
      [
        "transferFrom(address,address,bytes32,bytes)"
      ](this.signers.alice.address, this.signers.carol.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    const allowanceHandleAlice = await this.confidentialERC20.allowance(
      this.signers.alice.address,
      this.signers.carol.address,
    );

    await expect(
      this.confidentialERC20
        .connect(this.signers.bob)
        .transferFrom(this.signers.alice.address, this.signers.bob.address, allowanceHandleAlice),
    ).to.be.revertedWithCustomError(this.confidentialERC20, "TFHESenderNotAllowed");
  });

  it("cannot reencrypt errors if the account is not a participant of the transfer", async function () {
    const mintAmount = 10_000;
    const transferAmount = 1337;
    const expectedTransferId = 0;

    let tx = await this.confidentialERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    tx = await this.confidentialERC20
      .connect(this.signers.alice)
      [
        "transfer(address,bytes32,bytes)"
      ](this.signers.bob.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

    await expect(tx)
      .to.emit(this.confidentialERC20, "Transfer")
      .withArgs(this.signers.alice, this.signers.bob, expectedTransferId);

    const errorCodeHandle = await this.confidentialERC20.getErrorCodeForTransferId(expectedTransferId);

    const { publicKey: publicKeyCarol, privateKey: privateKeyCarol } = this.instance.generateKeypair();
    const eip712Carol = this.instance.createEIP712(publicKeyCarol, this.confidentialERC20Address);
    const signatureCarol = await this.signers.carol.signTypedData(
      eip712Carol.domain,
      { Reencrypt: eip712Carol.types.Reencrypt },
      eip712Carol.message,
    );

    await expect(
      this.instance.reencrypt(
        errorCodeHandle,
        privateKeyCarol,
        publicKeyCarol,
        signatureCarol.replace("0x", ""),
        this.confidentialERC20Address,
        this.signers.carol.address,
      ),
    ).to.be.rejectedWith("User is not authorized to reencrypt this handle!");
  });

  it("sender who is not allowed cannot approve using a handle from another account", async function () {
    const amount = 100_000;
    const input = this.instance.createEncryptedInput(this.confidentialERC20Address, this.signers.alice.address);
    input.add64(amount);
    const encryptedAllowanceAmount = await input.encrypt();

    const tx = await this.confidentialERC20
      .connect(this.signers.alice)
      [
        "approve(address,bytes32,bytes)"
      ](this.signers.carol.address, encryptedAllowanceAmount.handles[0], encryptedAllowanceAmount.inputProof);

    await tx.wait();

    const allowanceHandleAlice = await this.confidentialERC20.allowance(
      this.signers.alice.address,
      this.signers.carol.address,
    );

    await expect(
      this.confidentialERC20.connect(this.signers.bob).approve(this.signers.carol.address, allowanceHandleAlice),
    ).to.be.revertedWithCustomError(this.confidentialERC20, "TFHESenderNotAllowed");
  });

  it("ConfidentialERC20WithErrorsMintable - only owner can mint", async function () {
    await expect(this.confidentialERC20.connect(this.signers.bob).mint(1)).to.be.revertedWithCustomError(
      this.confidentialERC20,
      "OwnableUnauthorizedAccount",
    );
  });
});
