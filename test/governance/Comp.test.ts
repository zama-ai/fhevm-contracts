import { expect } from "chai";
import { parseUnits } from "ethers";
import { ethers, network } from "hardhat";

import { reencryptBalance } from "../encryptedERC20/EncryptedERC20.fixture";
import { createInstances } from "../instance";
import { reencryptEuint64 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { waitNBlocks } from "../utils";
import { deployCompFixture, reencryptCurrentVotes, reencryptPriorVotes } from "./Comp.fixture";
import { delegateBySig } from "./DelegateBySig";

describe("Comp", function () {
  before(async function () {
    await initSigners(3);
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const contract = await deployCompFixture(this.signers);
    this.compAddress = await contract.getAddress();
    this.comp = contract;
    this.instances = await createInstances(this.signers);
  });

  it("should transfer tokens", async function () {
    const transferAmount = parseUnits(String(2_000_000), 6);

    const input = this.instances.alice.createEncryptedInput(this.compAddress, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    const tx = await this.comp["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    await tx.wait();

    // Decrypt Alice's balance
    expect(await reencryptBalance(this.signers, this.instances, "alice", this.comp, this.compAddress)).to.equal(
      parseUnits(String(8_000_000), 6),
    );

    // Decrypt Bob's balance
    expect(await reencryptBalance(this.signers, this.instances, "bob", this.comp, this.compAddress)).to.equal(
      parseUnits(String(2_000_000), 6),
    );
  });

  it("can delegate tokens on-chain", async function () {
    const tx = await this.comp.connect(this.signers.alice).delegate(this.signers.bob.address);
    await tx.wait();

    const latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    expect(
      await reencryptPriorVotes(this.signers, this.instances, "bob", latestBlockNumber, this.comp, this.compAddress),
    ).to.equal(parseUnits(String(10_000_000), 6));

    // Verify the two functions return the same.
    expect(
      await reencryptPriorVotes(this.signers, this.instances, "bob", latestBlockNumber, this.comp, this.compAddress),
    ).to.equal(await reencryptCurrentVotes(this.signers, this.instances, "bob", this.comp, this.compAddress));
  });

  it("can delegate votes via delegateBySig if signature is valid", async function () {
    const delegator = this.signers.alice;
    const delegatee = this.signers.bob;
    const nonce = 0;
    let latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 100;
    const signature = await delegateBySig(delegator, delegatee.address, this.comp, nonce, expiry, false);

    const tx = await this.comp
      .connect(this.signers.alice)
      .delegateBySig(delegator, delegatee, nonce, expiry, signature);
    await tx.wait();

    latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    expect(
      await reencryptPriorVotes(this.signers, this.instances, "bob", latestBlockNumber, this.comp, this.compAddress),
    ).to.equal(parseUnits(String(10_000_000), 6));

    // Verify the two functions return the same.
    expect(
      await reencryptPriorVotes(this.signers, this.instances, "bob", latestBlockNumber, this.comp, this.compAddress),
    ).to.equal(await reencryptCurrentVotes(this.signers, this.instances, "bob", this.comp, this.compAddress));
  });

  it("cannot delegate votes to self but it gets removed once the tokens are transferred", async function () {
    let tx = await this.comp.connect(this.signers.alice).delegate(this.signers.alice.address);
    await tx.wait();

    let latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    expect(
      await reencryptPriorVotes(this.signers, this.instances, "alice", latestBlockNumber, this.comp, this.compAddress),
    ).to.equal(parseUnits(String(10_000_000), 6));

    const transferAmount = parseUnits(String(10_000_000), 6);
    const input = this.instances.alice.createEncryptedInput(this.compAddress, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    tx = await this.comp
      .connect(this.signers.alice)
      ["transfer(address,bytes32,bytes)"](
        this.signers.bob.address,
        encryptedTransferAmount.handles[0],
        encryptedTransferAmount.inputProof,
      );

    await tx.wait();

    latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    expect(
      await reencryptPriorVotes(this.signers, this.instances, "alice", latestBlockNumber, this.comp, this.compAddress),
    ).to.equal(0);
  });

  it("cannot delegate votes if nonce is invalid", async function () {
    const delegator = this.signers.alice;
    const delegatee = this.signers.bob;
    const nonce = 0;
    const block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    const expiry = block!.timestamp + 100;
    const signature = await delegateBySig(delegator, delegatee.address, this.comp, nonce, expiry);

    const tx = await this.comp
      .connect(this.signers.alice)
      .delegateBySig(delegator, delegatee, nonce, expiry, signature);
    await tx.wait();

    // Cannot reuse same nonce when delegating by sig
    await expect(this.comp.delegateBySig(delegator, delegatee, nonce, expiry, signature)).to.be.revertedWithCustomError(
      this.comp,
      "SignatureNonceInvalid",
    );
  });

  it("cannot delegate votes if nonce is invalid due to the delegator incrementing her nonce", async function () {
    const delegator = this.signers.alice;
    const delegatee = this.signers.bob;
    const nonce = 0;
    const block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    const expiry = block!.timestamp + 100;
    const signature = await delegateBySig(delegator, delegatee.address, this.comp, nonce, expiry);

    const tx = await this.comp.connect(delegator).incrementNonce();
    await tx.wait();

    // Cannot reuse same nonce when delegating by sig
    await expect(this.comp.delegateBySig(delegator, delegatee, nonce, expiry, signature)).to.be.revertedWithCustomError(
      this.comp,
      "SignatureNonceInvalid",
    );
  });

  it("cannot delegate votes if signer is invalid", async function () {
    const delegator = this.signers.alice;
    const delegatee = this.signers.bob;
    const nonce = 0;
    const block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    const expiry = block!.timestamp + 100;

    // Signer is not the delegator
    const signature = await delegateBySig(this.signers.carol, delegatee.address, this.comp, nonce, expiry);
    await expect(this.comp.delegateBySig(delegator, delegatee, nonce, expiry, signature)).to.be.revertedWithCustomError(
      this.comp,
      "SignatureVerificationFail",
    );
  });

  it("cannot delegate votes if signature has expired", async function () {
    const delegator = this.signers.alice;
    const delegatee = this.signers.bob;
    const nonce = 0;
    const block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    const expiry = block!.timestamp + 100;
    const signature = await delegateBySig(delegator, delegatee.address, this.comp, nonce, expiry);

    await ethers.provider.send("evm_increaseTime", ["0xffff"]);

    await expect(
      this.comp.connect(delegatee).delegateBySig(delegator, delegatee, nonce, expiry, signature),
    ).to.be.revertedWithCustomError(this.comp, "SignatureExpired");
  });

  it("cannot request votes if blocktime is equal to current blocktime", async function () {
    let blockNumber = await ethers.provider.getBlockNumber();

    await expect(this.comp.getPriorVotes(this.signers.alice, blockNumber + 1)).to.be.revertedWithCustomError(
      this.comp,
      "BlockNumberEqualOrHigherThanCurrentBlock",
    );

    const tx = await this.comp.connect(this.signers.alice).setGovernor(this.signers.bob);
    await tx.wait();

    blockNumber = await ethers.provider.getBlockNumber();

    await expect(
      this.comp.connect(this.signers.bob).getPriorVotesForGovernor(this.signers.alice, blockNumber + 1),
    ).to.be.revertedWithCustomError(this.comp, "BlockNumberEqualOrHigherThanCurrentBlock");
  });

  it("users can request past votes getPriorVotes", async function () {
    // Alice transfers 1M tokens to Bob, 1M tokens to Carol, 1M tokens to Dave
    const transferAmount = parseUnits(String(1_000_000), 6);

    const input = this.instances.alice.createEncryptedInput(this.compAddress, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    let tx = await this.comp["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    await tx.wait();

    tx = await this.comp["transfer(address,bytes32,bytes)"](
      this.signers.carol.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    await tx.wait();

    tx = await this.comp["transfer(address,bytes32,bytes)"](
      this.signers.dave.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    await tx.wait();

    tx = await this.comp.connect(this.signers.bob).delegate(this.signers.dave.address);
    await tx.wait();

    const firstCheckPointBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    tx = await this.comp.connect(this.signers.carol).delegate(this.signers.dave.address);
    await tx.wait();

    const secondCheckPointBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    expect(
      await reencryptPriorVotes(
        this.signers,
        this.instances,
        "dave",
        firstCheckPointBlockNumber,
        this.comp,
        this.compAddress,
      ),
    ).to.be.equal(parseUnits(String(1_000_000), 6));

    expect(
      await reencryptPriorVotes(
        this.signers,
        this.instances,
        "dave",
        secondCheckPointBlockNumber,
        this.comp,
        this.compAddress,
      ),
    ).to.be.equal(parseUnits(String(2_000_000), 6));
  });

  it("only governor contract can call getPriorVotes", async function () {
    await expect(
      this.comp.getPriorVotesForGovernor("0xE359a77c3bFE58792FB167D05720e37032A1e520", 0),
    ).to.be.revertedWithCustomError(this.comp, "GovernorInvalid");
  });

  it("only owner can set governor contract", async function () {
    const newAllowedContract = "0x9d3e06a2952dc49EDCc73e41C76645797fC53967";
    await expect(this.comp.connect(this.signers.bob).setGovernor(newAllowedContract))
      .to.be.revertedWithCustomError(this.comp, "OwnableUnauthorizedAccount")
      .withArgs(this.signers.bob.address);
  });

  it("getCurrentVote/getPriorVotes without any vote cannot be decrypted", async function () {
    // 1. If no checkpoint exists using getCurrentVotes
    let currentVoteHandle = await this.comp.connect(this.signers.bob).getCurrentVotes(this.signers.bob.address);
    expect(currentVoteHandle).to.be.eq(BigInt(0));

    await expect(
      reencryptEuint64(this.signers, this.instances, "bob", currentVoteHandle, this.comp),
    ).to.be.rejectedWith("Handle is not initialized");

    // 2. If no checkpoint exists using getPriorVotes
    let latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    currentVoteHandle = await this.comp
      .connect(this.signers.bob)
      .getPriorVotes(this.signers.bob.address, latestBlockNumber);

    // It is an encrypted constant that is not reencryptable by Bob.
    expect(currentVoteHandle).not.to.be.eq(BigInt(0));

    await expect(
      reencryptEuint64(this.signers, this.instances, "bob", currentVoteHandle, this.comp),
    ).to.be.rejectedWith("Invalid contract address.");

    // 3. If a checkpoint exists using getPriorVotes but block.number < block of first checkpoint
    latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    const tx = await this.comp.connect(this.signers.alice).delegate(this.signers.bob.address);
    await tx.wait();

    currentVoteHandle = await this.comp
      .connect(this.signers.bob)
      .getPriorVotes(this.signers.bob.address, latestBlockNumber);

    // It is an encrypted constant that is not reencryptable by Bob.
    expect(currentVoteHandle).not.to.be.eq(BigInt(0));

    await expect(
      reencryptEuint64(this.signers, this.instances, "bob", currentVoteHandle, this.comp),
    ).to.be.rejectedWith("Invalid contract address.");
  });

  it("can do multiple checkpoints and access the values when needed", async function () {
    let i = 0;

    const blockNumbers = [];

    const thisBlockNumber = await ethers.provider.getBlockNumber();

    while (i < 20) {
      let tx = await this.comp.connect(this.signers.alice).delegate(this.signers.alice.address);
      await tx.wait();
      blockNumbers.push(await ethers.provider.getBlockNumber());

      tx = await this.comp.connect(this.signers.alice).delegate(this.signers.carol.address);
      await tx.wait();
      blockNumbers.push(await ethers.provider.getBlockNumber());
      i++;
    }

    await waitNBlocks(1);

    // There are 40 checkpoints for Alice and 39 checkpoints for Carol
    expect(await this.comp.numCheckpoints(this.signers.alice.address)).to.eq(BigInt(40));
    expect(await this.comp.numCheckpoints(this.signers.carol.address)).to.eq(BigInt(39));

    i = 0;

    const startWithAlice = thisBlockNumber % 2 === 1;

    while (i < 40) {
      if (blockNumbers[i] % 2 === 0) {
        expect(
          await reencryptPriorVotes(
            this.signers,
            this.instances,
            startWithAlice ? "alice" : "carol",
            blockNumbers[i],
            this.comp,
            this.compAddress,
          ),
        ).to.be.eq(parseUnits(String(10_000_000), 6));
      } else {
        expect(
          await reencryptPriorVotes(
            this.signers,
            this.instances,
            startWithAlice ? "carol" : "alice",
            blockNumbers[i],
            this.comp,
            this.compAddress,
          ),
        ).to.be.eq(parseUnits(String(10_000_000), 6));
      }
      i++;
    }
  });

  it("governor address can access votes for any account", async function () {
    // Bob becomes the governor address.
    let tx = await this.comp.connect(this.signers.alice).setGovernor(this.signers.bob.address);
    await tx.wait();

    // Alice delegates her votes to Carol.
    tx = await this.comp.connect(this.signers.alice).delegate(this.signers.carol.address);
    await tx.wait();

    const latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);
    await waitNBlocks(1);

    // Bob, the governor address, gets the prior votes of Carol.
    // @dev It is not possible to catch the return value since it is not a view function.
    // GovernorAlphaZama.test.ts contains tests that use this function.
    await this.comp
      .connect(this.signers.bob)
      .getPriorVotesForGovernor(this.signers.carol.address, latestBlockNumber + 1);
  });

  it("different voters can delegate to same delegatee", async function () {
    const transferAmount = parseUnits(String(2_000_000), 6);

    const input = this.instances.alice.createEncryptedInput(this.compAddress, this.signers.alice.address);
    input.add64(transferAmount);
    const encryptedTransferAmount = await input.encrypt();

    let tx = await this.comp["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    await tx.wait();

    tx = await this.comp.connect(this.signers.alice).delegate(this.signers.carol);
    await tx.wait();

    tx = await this.comp.connect(this.signers.bob).delegate(this.signers.carol);
    await tx.wait();

    const latestBlockNumber = await ethers.provider.getBlockNumber();
    await waitNBlocks(1);

    expect(await reencryptCurrentVotes(this.signers, this.instances, "carol", this.comp, this.compAddress)).to.equal(
      parseUnits(String(10_000_000), 6),
    );

    expect(
      await reencryptPriorVotes(this.signers, this.instances, "carol", latestBlockNumber, this.comp, this.compAddress),
    ).to.equal(await reencryptCurrentVotes(this.signers, this.instances, "carol", this.comp, this.compAddress));
  });

  // TODO: fix issue with mining
  it.skip("number of checkpoints is incremented once per block, even when written multiple times in same block", async function () {
    await network.provider.send("evm_setAutomine", [false]);
    await network.provider.send("evm_setIntervalMining", [0]);

    // do two checkpoints in same block
    const tx1 = this.comp.connect(this.signers.alice).delegate(this.signers.bob);
    const tx2 = this.comp.connect(this.signers.alice).delegate(this.signers.carol);

    await network.provider.send("evm_mine");
    await network.provider.send("evm_setAutomine", [true]);
    await Promise.all([tx1, tx2]);

    expect(await this.comp.numCheckpoints(this.signers.alice.address)).to.be.equal(0n);
    expect(await this.comp.numCheckpoints(this.signers.bob.address)).to.be.equal(1n);
    expect(await this.comp.numCheckpoints(this.signers.carol.address)).to.be.equal(1n);

    expect(await reencryptCurrentVotes(this.signers, this.instances, "bob", this.comp, this.compAddress)).to.equal(0);

    expect(await reencryptCurrentVotes(this.signers, this.instances, "carol", this.comp, this.compAddress)).to.equal(
      parseUnits(String(10_000_000), 6),
    );
  });
});
