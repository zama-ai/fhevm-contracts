import { expect } from "chai";

import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { deployEncryptedERC20Fixture, reencryptAllowance, reencryptBalance } from "./EncryptedERC20.fixture";

describe("EncryptedERC20", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const contract = await deployEncryptedERC20Fixture("Naraggara", "NARA");
    this.encryptedERC20Address = await contract.getAddress();
    this.encryptedERC20 = contract;
    this.instances = await createInstances(this.signers);
  });

  it("post-deployment state", async function () {
    expect(await this.encryptedERC20.totalSupply()).to.equal(0);
    expect(await this.encryptedERC20.name()).to.equal("Naraggara");
    expect(await this.encryptedERC20.symbol()).to.equal("NARA");
  });

  it("should mint the contract", async function () {
    const mintAmount = 1000;
    const tx = await this.encryptedERC20.mint(mintAmount);
    await tx.wait();

    expect(
      await reencryptBalance(this.signers, this.instances, "alice", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(mintAmount);

    expect(await this.encryptedERC20.totalSupply()).to.equal(mintAmount);
  });

  it("should transfer tokens between two users", async function () {
    const mintAmount = 10_000;
    const transferAmount = 1337;

    let tx = await this.encryptedERC20.mint(mintAmount);
    const t1 = await tx.wait();
    expect(t1?.status).to.eq(1);

    const input = this.instances.alice.createEncryptedInput(this.encryptedERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = input.encrypt();

    tx = await this.encryptedERC20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    const t2 = await tx.wait();
    expect(t2?.status).to.eq(1);

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "alice", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(mintAmount - transferAmount);

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "bob", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(transferAmount);
  });

  it("should not transfer tokens between two users if transfer amount is higher than balance", async function () {
    // @dev There is no transfer done since the mint amount is smaller than the transfer
    //      amount.
    const mintAmount = 1000;
    const transferAmount = 1337;

    let tx = await this.encryptedERC20.mint(mintAmount);
    await tx.wait();

    const input = this.instances.alice.createEncryptedInput(this.encryptedERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = input.encrypt();
    tx = await this.encryptedERC20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await tx.wait();

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "alice", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(mintAmount);

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "bob", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(0);
  });

  it("should be able to transferFrom only if allowance is sufficient", async function () {
    // @dev There is no transfer done since the mint amount is smaller than the transfer
    //      amount.
    const mintAmount = 10_000;
    const transferAmount = 1337;

    let tx = await this.encryptedERC20.mint(mintAmount);
    await tx.wait();

    const inputAlice = this.instances.alice.createEncryptedInput(
      this.encryptedERC20Address,
      this.signers.alice.address,
    );
    inputAlice.add64(transferAmount);
    const encryptedAllowanceAmount = inputAlice.encrypt();
    tx = await this.encryptedERC20["approve(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedAllowanceAmount.handles[0],
      encryptedAllowanceAmount.inputProof,
    );
    await tx.wait();

    // @dev The allowance amount is set to be equal to the transfer amount.
    expect(
      await reencryptAllowance(
        this.signers,
        this.instances,
        "alice",
        "bob",
        this.encryptedERC20,
        this.encryptedERC20Address,
      ),
    ).to.equal(transferAmount);

    const bobErc20 = this.encryptedERC20.connect(this.signers.bob);
    const inputBob1 = this.instances.bob.createEncryptedInput(this.encryptedERC20Address, this.signers.bob.address);
    inputBob1.add64(transferAmount + 1); // above allowance so next tx should actually not send any token
    const encryptedTransferAmount = inputBob1.encrypt();
    const tx2 = await bobErc20["transferFrom(address,address,bytes32,bytes)"](
      this.signers.alice.address,
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await tx2.wait();

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "alice", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(mintAmount); // check that transfer did not happen, as expected

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "bob", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(0); // check that transfer did not happen, as expected

    const inputBob2 = this.instances.bob.createEncryptedInput(this.encryptedERC20Address, this.signers.bob.address);
    inputBob2.add64(transferAmount); // below allowance so next tx should send token
    const encryptedTransferAmount2 = inputBob2.encrypt();
    const tx3 = await bobErc20["transferFrom(address,address,bytes32,bytes)"](
      this.signers.alice.address,
      this.signers.bob.address,
      encryptedTransferAmount2.handles[0],
      encryptedTransferAmount2.inputProof,
    );
    await tx3.wait();

    // Decrypt Alice's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "alice", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(mintAmount - transferAmount); // check that transfer did happen this time

    // Decrypt Bob's balance
    expect(
      await reencryptBalance(this.signers, this.instances, "bob", this.encryptedERC20, this.encryptedERC20Address),
    ).to.equal(transferAmount); // check that transfer did happen this time

    // Verify Alice's allowance is 0
    expect(
      await reencryptAllowance(
        this.signers,
        this.instances,
        "alice",
        "bob",
        this.encryptedERC20,
        this.encryptedERC20Address,
      ),
    ).to.equal(0);
  });

  it("should not be able to read the allowance if not spender/owner after initialization", async function () {
    const amount = 10_000;

    const inputAlice = this.instances.alice.createEncryptedInput(
      this.encryptedERC20Address,
      this.signers.alice.address,
    );
    inputAlice.add64(amount);
    const encryptedAllowanceAmount = inputAlice.encrypt();

    const tx = await this.encryptedERC20
      .connect(this.signers.alice)
      ["approve(address,bytes32,bytes)"](
        this.signers.bob.address,
        encryptedAllowanceAmount.handles[0],
        encryptedAllowanceAmount.inputProof,
      );

    await tx.wait();

    const allowanceHandleAlice = await this.encryptedERC20.allowance(this.signers.alice, this.signers.bob);

    const { publicKey: publicKeyCarol, privateKey: privateKeyCarol } = this.instances.carol.generateKeypair();
    const eip712Carol = this.instances.carol.createEIP712(publicKeyCarol, this.encryptedERC20Address);
    const signatureCarol = await this.signers.carol.signTypedData(
      eip712Carol.domain,
      { Reencrypt: eip712Carol.types.Reencrypt },
      eip712Carol.message,
    );

    try {
      await this.instances.bob.reencrypt(
        allowanceHandleAlice,
        privateKeyCarol,
        publicKeyCarol,
        signatureCarol.replace("0x", ""),
        this.encryptedERC20Address,
        this.signers.carol.address,
      );

      expect.fail("Expected an error to be thrown - Carol should not be able to reencrypt Bob's allowance for Alice");
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).to.equal("User is not authorized to reencrypt this handle!");
      }
    }
  });

  it("should not be able to read the balance if not user after initialization", async function () {
    // Mint is used to initialize the balanceOf(alice)
    const amount = 10_000;
    const tx = await this.encryptedERC20.connect(this.signers.alice).mint(amount);
    await tx.wait();

    const balanceHandleAlice = await this.encryptedERC20.balanceOf(this.signers.alice);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.encryptedERC20Address);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );

    try {
      await this.instances.bob.reencrypt(
        balanceHandleAlice,
        privateKeyBob,
        publicKeyBob,
        signatureBob.replace("0x", ""),
        this.encryptedERC20Address,
        this.signers.bob.address,
      );
      expect.fail("Expected an error to be thrown - Bob should not be able to reencrypt Alice's balance");
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).to.equal("User is not authorized to reencrypt this handle!");
      }
    }
  });

  it("Sender who is not allowed cannot transfer using a handle from another account", async function () {
    const mintAmount = 100_000;
    const transferAmount = 50_000;
    let tx = await this.encryptedERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    const input = this.instances.alice.createEncryptedInput(this.encryptedERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = input.encrypt();

    tx = await this.encryptedERC20
      .connect(this.signers.alice)
      ["transfer(address,bytes32,bytes)"](
        this.signers.carol.address,
        encryptedTransferAmount.handles[0],
        encryptedTransferAmount.inputProof,
      );

    await tx.wait();

    const balanceHandleAlice = await this.encryptedERC20.balanceOf(this.signers.alice.address);

    await expect(
      this.encryptedERC20.connect(this.signers.bob).transfer(this.signers.carol.address, balanceHandleAlice),
    ).to.be.revertedWithCustomError(this.encryptedERC20, "TFHESenderNotAllowed");
  });

  it("Sender who is not allowed cannot transferFrom using a handle from another account", async function () {
    const mintAmount = 100_000;
    const transferAmount = 50_000;

    let tx = await this.encryptedERC20.connect(this.signers.alice).mint(mintAmount);
    await tx.wait();

    let input = this.instances.alice.createEncryptedInput(this.encryptedERC20Address, this.signers.alice.address);
    input.add64(mintAmount);
    const encryptedAllowanceAmount = input.encrypt();

    tx = await this.encryptedERC20
      .connect(this.signers.alice)
      ["approve(address,bytes32,bytes)"](
        this.signers.carol.address,
        encryptedAllowanceAmount.handles[0],
        encryptedAllowanceAmount.inputProof,
      );

    input = this.instances.alice.createEncryptedInput(this.encryptedERC20Address, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = input.encrypt();

    tx = await this.encryptedERC20
      .connect(this.signers.carol)
      ["transferFrom(address,address,bytes32,bytes)"](
        this.signers.alice.address,
        this.signers.carol.address,
        encryptedTransferAmount.handles[0],
        encryptedTransferAmount.inputProof,
      );

    const allowanceHandleAlice = await this.encryptedERC20.allowance(
      this.signers.alice.address,
      this.signers.carol.address,
    );

    await expect(
      this.encryptedERC20
        .connect(this.signers.bob)
        .transferFrom(this.signers.alice.address, this.signers.bob.address, allowanceHandleAlice),
    ).to.be.revertedWithCustomError(this.encryptedERC20, "TFHESenderNotAllowed");
  });

  it("Sender who is not allowed cannot approve using a handle from another account", async function () {
    const amount = 100_000;
    const input = this.instances.alice.createEncryptedInput(this.encryptedERC20Address, this.signers.alice.address);
    input.add64(amount);
    const encryptedAllowanceAmount = input.encrypt();

    const tx = await this.encryptedERC20
      .connect(this.signers.alice)
      ["approve(address,bytes32,bytes)"](
        this.signers.carol.address,
        encryptedAllowanceAmount.handles[0],
        encryptedAllowanceAmount.inputProof,
      );

    await tx.wait();

    const allowanceHandleAlice = await this.encryptedERC20.allowance(
      this.signers.alice.address,
      this.signers.carol.address,
    );

    await expect(
      this.encryptedERC20.connect(this.signers.bob).approve(this.signers.carol.address, allowanceHandleAlice),
    ).to.be.revertedWithCustomError(this.encryptedERC20, "TFHESenderNotAllowed");
  });
});
