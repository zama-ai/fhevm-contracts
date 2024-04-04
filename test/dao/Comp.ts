import { expect } from "chai";
import { ethers, network } from "hardhat";

import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { createTransaction, mineNBlocks, waitNBlocks } from "../utils";
import { deployCompFixture } from "./Comp.fixture";
import { delegateBySigSignature } from "./DelegateBySig";

describe("Comp", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const contract = await deployCompFixture();
    this.contractAddress = await contract.getAddress();
    this.comp = contract;
    this.instances = await createInstances(this.contractAddress, ethers, this.signers);
  });

  // 9000n , 31337n

  it("only owner could set allowed contract", async function () {
    const tx = await this.comp.setAllowedContract("0xE359a77c3bFE58792FB167D05720e37032A1e520");
    await tx.wait();

    if (network.name === "hardhat") {
      // mocked mode
      await expect(this.comp.connect(this.signers.bob).setAllowedContract("0x9d3e06a2952dc49EDCc73e41C76645797fC53967"))
        .to.be.revertedWithCustomError(this.comp, "OwnableUnauthorizedAccount")
        .withArgs(this.signers.bob.address);
    } else {
      // fhevm-mode
      const tx = await this.comp
        .connect(this.signers.bob)
        .setAllowedContract("0x9d3e06a2952dc49EDCc73e41C76645797fC53967", { gasLimit: 1_000_000 });
      await expect(tx.wait()).to.throw;
    }
  });

  it("only allowed contract can call getPriorVotes", async function () {
    await expect(this.comp.getPriorVotes("0xE359a77c3bFE58792FB167D05720e37032A1e520", 0)).to.be.revertedWith(
      "Caller not allowed to call this function",
    );
  });

  it("should transfer tokens", async function () {
    const encryptedAmountToTransfer = this.instances.alice.encrypt64(2_000_000n * 10n ** 6n);
    const transferTransac = await this.comp["transfer(address,bytes)"](
      this.signers.bob.address,
      encryptedAmountToTransfer,
    );

    await transferTransac.wait();

    const aliceToken = this.instances.alice.getPublicKey(this.contractAddress);
    const encryptedAliceBalance = await this.comp.balanceOf(
      this.signers.alice.address,
      aliceToken.publicKey,
      aliceToken.signature,
    );
    // Decrypt Alice's balance
    const aliceBalance = this.instances.alice.decrypt(this.contractAddress, encryptedAliceBalance);
    expect(aliceBalance).to.equal(8_000_000n * 10n ** 6n);

    let encryptedAliceVotes = await this.comp.getMyCurrentVotes(aliceToken.publicKey, aliceToken.signature);
    // Decrypt Alice's current votes
    let aliceCurrentVotes = this.instances.alice.decrypt(this.contractAddress, encryptedAliceVotes);
    expect(aliceCurrentVotes).to.equal(0n);

    // Bob should not be able to decrypt Alice's votes
    await expect(
      this.comp.connect(this.signers.bob).getMyCurrentVotes(aliceToken.publicKey, aliceToken.signature),
    ).to.be.revertedWith("EIP712 signer and transaction signer do not match");

    const tx = await this.comp.delegate(this.signers.alice);
    await tx.wait();
    encryptedAliceVotes = await this.comp.getMyCurrentVotes(aliceToken.publicKey, aliceToken.signature);
    // Decrypt Alice's current votes
    aliceCurrentVotes = this.instances.alice.decrypt(this.contractAddress, encryptedAliceVotes);
    expect(aliceCurrentVotes).to.equal(8_000_000n * 10n ** 6n);

    const tx2 = await createTransaction(this.comp.delegate, this.signers.bob);
    await tx2.wait();
    encryptedAliceVotes = await this.comp.getMyCurrentVotes(aliceToken.publicKey, aliceToken.signature);
    // Decrypt Alice's current votes
    aliceCurrentVotes = this.instances.alice.decrypt(this.contractAddress, encryptedAliceVotes);
    expect(aliceCurrentVotes).to.equal(0n);

    const bobToken = this.instances.bob.getPublicKey(this.contractAddress);
    const encryptedBobBalance = await this.comp
      .connect(this.signers.bob)
      .balanceOf(this.signers.bob.address, bobToken.publicKey, bobToken.signature);
    // Decrypt Bob's balance
    const bobBalance = this.instances.bob.decrypt(this.contractAddress, encryptedBobBalance);
    expect(bobBalance).to.equal(2_000_000n * 10n ** 6n);
  });

  it("can't transfer to nor from null address", async function () {
    const nullAddress = "0x0000000000000000000000000000000000000000";
    const encryptedAmountToTransfer = this.instances.alice.encrypt64(1n * 10n ** 6n);
    const encryptedAmountToTransferNull = this.instances.alice.encrypt64(0n);
    if (network.name === "hardhat") {
      // mocked mode
      await expect(this.comp["transfer(address,bytes)"](nullAddress, encryptedAmountToTransfer)).to.be.revertedWith(
        "Comp::_transferTokens: cannot transfer to the zero address",
      );
      await expect(
        this.comp["transferFrom(address,address,bytes)"](
          nullAddress,
          this.signers.bob.address,
          encryptedAmountToTransfer,
        ),
      ).to.be.revertedWith("Comp::_transferTokens: cannot transfer from the zero address");
    } else {
      // fhevm-mode
      const tx = await this.comp["transfer(address,bytes)"](nullAddress, encryptedAmountToTransferNull, {
        gasLimit: 1_000_000,
      });

      await expect(tx.wait()).to.throw;
      const tx2 = await this.comp["transferFrom(address,address,bytes)"](
        nullAddress,
        this.signers.bob.address,
        encryptedAmountToTransferNull,
        { gasLimit: 1_000_000 },
      );
      await expect(tx2.wait()).to.throw;
    }
  });

  it("can't transfer from null address", async function () {
    const tx = await this.comp.setAllowedContract("0xE359a77c3bFE58792FB167D05720e37032A1e520");
    await tx.wait();

    if (network.name === "hardhat") {
      // mocked mode
      await expect(this.comp.connect(this.signers.bob).setAllowedContract("0x9d3e06a2952dc49EDCc73e41C76645797fC53967"))
        .to.be.revertedWithCustomError(this.comp, "OwnableUnauthorizedAccount")
        .withArgs(this.signers.bob.address);
    } else {
      // fhevm-mode
      const tx = await this.comp
        .connect(this.signers.bob)
        .setAllowedContract("0x9d3e06a2952dc49EDCc73e41C76645797fC53967", { gasLimit: 1_000_000 });
      await expect(tx.wait()).to.throw;
    }
  });

  it("can delegate votes via delegateBySig if signature is valid", async function () {
    const delegatee = this.signers.bob.address;
    const nonce = 0;
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 100;
    const [v, r, s] = await delegateBySigSignature(this.signers.alice, delegatee, this.comp, nonce, expiry);

    const tx = await this.comp.delegateBySig(delegatee, nonce, expiry, v, r, s);
    await tx.wait();

    const tokenBob = this.instances.bob.getPublicKey(this.contractAddress);
    const encryptedCurrentVotes = await this.comp
      .connect(this.signers.bob)
      .getMyCurrentVotes(tokenBob.publicKey, tokenBob.signature);
    const currentVotes = this.instances.bob.decrypt(this.contractAddress, encryptedCurrentVotes);
    expect(currentVotes).to.equal(10_000_000n * 10n ** 6n);

    if (network.name === "hardhat") {
      // can't reuse same nonce when delegating by sig
      await expect(this.comp.delegateBySig(delegatee, nonce, expiry, v, r, s)).to.be.revertedWith(
        "Comp::delegateBySig: invalid nonce",
      );

      // can't use invalid signature when delegating by sig
      await expect(this.comp.delegateBySig(delegatee, nonce, expiry, 30, r, s)).to.be.revertedWith(
        "Comp::delegateBySig: invalid signature",
      );

      // can't use signature after expiry
      ethers.provider.send("evm_increaseTime", ["0xffff"]);
      const [v2, r2, s2] = await delegateBySigSignature(this.signers.alice, delegatee, this.comp, 1, expiry);
      await expect(this.comp.delegateBySig(delegatee, nonce, expiry, v2, r2, s2)).to.be.revertedWith(
        "Comp::delegateBySig: signature expired",
      );
    }
  });

  it("comp becomes obsolete after max(uint32) blocks", async function () {
    if (network.name === "hardhat") {
      // mocked mode
      const tx = await this.comp.delegate(this.signers.bob.address);
      await tx.wait();
      const idSnapshot = await ethers.provider.send("evm_snapshot");

      await mineNBlocks(2 ** 32);
      const encryptedAmountToTransfer = this.instances.alice.encrypt64(2_000_000n * 10n ** 6n);
      await expect(
        this.comp["transfer(address,bytes)"](this.signers.carol.address, encryptedAmountToTransfer),
      ).to.be.revertedWith("Comp::_writeCheckpoint: block number exceeds 32 bits");
      await ethers.provider.send("evm_revert", [idSnapshot]);
    }
  });

  it("user can request his past votes via getMyPriorVotes", async function () {
    const aliceToken = this.instances.alice.getPublicKey(this.contractAddress);
    const initBlock = await ethers.provider.getBlockNumber();
    let aliceMyPriorVotesEnc = await this.comp.getMyPriorVotes(
      initBlock - 1,
      aliceToken.publicKey,
      aliceToken.signature,
    );
    let aliceMyPriorVotes = this.instances.alice.decrypt(this.contractAddress, aliceMyPriorVotesEnc);
    expect(aliceMyPriorVotes).to.be.equal(0n);

    const tx = await this.comp.delegate(this.signers.alice.address);
    await tx.wait();
    const firstCheckPointBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    aliceMyPriorVotesEnc = await this.comp.getMyPriorVotes(
      firstCheckPointBlockNumber,
      aliceToken.publicKey,
      aliceToken.signature,
    );
    aliceMyPriorVotes = this.instances.alice.decrypt(this.contractAddress, aliceMyPriorVotesEnc);
    expect(aliceMyPriorVotes).to.be.equal(10000000000000n);

    aliceMyPriorVotesEnc = await this.comp.getMyPriorVotes(
      firstCheckPointBlockNumber - 1,
      aliceToken.publicKey,
      aliceToken.signature,
    );
    aliceMyPriorVotes = this.instances.alice.decrypt(this.contractAddress, aliceMyPriorVotesEnc);
    expect(aliceMyPriorVotes).to.be.equal(0n);

    await expect(
      this.comp.getMyPriorVotes(firstCheckPointBlockNumber + 1, aliceToken.publicKey, aliceToken.signature),
    ).to.be.revertedWith("Comp::getPriorVotes: not yet determined");

    // Bob cannot decrypt Alice's prior votes
    await expect(
      this.comp
        .connect(this.signers.bob)
        .getMyPriorVotes(firstCheckPointBlockNumber - 1, aliceToken.publicKey, aliceToken.signature),
    ).to.be.revertedWith("EIP712 signer and transaction signer do not match");

    const encryptedAmountToTransfer = this.instances.alice.encrypt64(2_000_000n * 10n ** 6n);
    const transferTransac = await this.comp["transfer(address,bytes)"](
      this.signers.bob.address,
      encryptedAmountToTransfer,
    );
    await transferTransac.wait();
    const secondCheckPointBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    aliceMyPriorVotesEnc = await this.comp.getMyPriorVotes(
      firstCheckPointBlockNumber,
      aliceToken.publicKey,
      aliceToken.signature,
    );
    aliceMyPriorVotes = this.instances.alice.decrypt(this.contractAddress, aliceMyPriorVotesEnc);
    expect(aliceMyPriorVotes).to.be.equal(10000000000000n);

    const encryptedAmountToTransfer2 = this.instances.alice.encrypt64(2_000_000n * 10n ** 6n);
    const transferTransac2 = await this.comp["transfer(address,bytes)"](
      this.signers.carol.address,
      encryptedAmountToTransfer2,
    );
    await transferTransac2.wait();
    await ethers.provider.getBlockNumber(); //  third CheckPoint
    await waitNBlocks(1);

    aliceMyPriorVotesEnc = await this.comp.getMyPriorVotes(
      secondCheckPointBlockNumber,
      aliceToken.publicKey,
      aliceToken.signature,
    );
    aliceMyPriorVotes = this.instances.alice.decrypt(this.contractAddress, aliceMyPriorVotesEnc);
    expect(aliceMyPriorVotes).to.be.equal(8000000000000n);

    aliceMyPriorVotesEnc = await this.comp.getMyPriorVotes(
      secondCheckPointBlockNumber + 1,
      aliceToken.publicKey,
      aliceToken.signature,
    );
    aliceMyPriorVotes = this.instances.alice.decrypt(this.contractAddress, aliceMyPriorVotesEnc);
    expect(aliceMyPriorVotes).to.be.equal(8000000000000n);
  });

  it("different voters can delegate to same delegatee", async function () {
    const encryptedAmountToTransfer = this.instances.alice.encrypt64(2_000_000n * 10n ** 6n);
    const tx1 = await this.comp["transfer(address,bytes)"](this.signers.bob.address, encryptedAmountToTransfer);
    await tx1.wait();

    const tx2 = await this.comp.delegate(this.signers.carol);
    await tx2.wait();

    const tx3 = await createTransaction(this.comp.connect(this.signers.bob).delegate, this.signers.carol);
    await tx3.wait();

    const carolToken = this.instances.carol.getPublicKey(this.contractAddress);
    let encryptedCarolVotes = await this.comp
      .connect(this.signers.carol)
      .getMyCurrentVotes(carolToken.publicKey, carolToken.signature);
    // Decrypt Alice's current votes
    let carolCurrentVotes = this.instances.carol.decrypt(this.contractAddress, encryptedCarolVotes);
    expect(carolCurrentVotes).to.equal(10000000000000n);
  });

  it("number of checkpoints is incremented once per block, even when written multiple times in same block", async function () {
    if (network.name === "hardhat") {
      // mocked mode
      await network.provider.send("evm_setAutomine", [false]);
      await network.provider.send("evm_setIntervalMining", [0]);
      // do two checkpoints in same block
      await this.comp.delegate(this.signers.bob);
      await this.comp.delegate(this.signers.carol);
      await network.provider.send("evm_mine");
      await network.provider.send("evm_setAutomine", [true]);
      expect(await this.comp.numCheckpoints(this.signers.alice)).to.be.equal(0n);
      expect(await this.comp.numCheckpoints(this.signers.bob)).to.be.equal(1n);
      expect(await this.comp.numCheckpoints(this.signers.carol)).to.be.equal(1n);
    }
  });
});
