import { expect } from "chai";
import { parseUnits } from "ethers";
import { ethers, network } from "hardhat";

import type { Comp } from "../../types";
import { reencryptBalance } from "../encryptedERC20/EncryptedERC20.fixture";
import { createInstances } from "../instance";
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
    (this.comp as Comp) = contract;
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
    const delegatee = this.signers.bob;
    const nonce = 0;
    let latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 100;
    const [v, r, s] = await delegateBySig(this.signers.alice, delegatee.address, this.comp, nonce, expiry);

    const tx = await this.comp.connect(this.signers.alice).delegateBySig(delegatee, nonce, expiry, v, r, s);
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

  it("cannot delegate votes if nonce is invalid", async function () {
    const delegatee = this.signers.bob;
    const nonce = 0;
    let latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 100;
    const [v, r, s] = await delegateBySig(this.signers.alice, delegatee.address, this.comp, nonce, expiry);

    const tx = await this.comp.connect(this.signers.alice).delegateBySig(delegatee, nonce, expiry, v, r, s);
    await tx.wait();

    // Cannot reuse same nonce when delegating by sig
    await expect(this.comp.delegateBySig(delegatee, nonce, expiry, v, r, s)).to.be.revertedWith(
      "Comp::delegateBySig: invalid nonce",
    );
  });

  it("cannot delegate votes if signer is invalid", async function () {
    const delegatee = this.signers.bob;
    const nonce = 0;
    let latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 100;
    const [v, r, s] = await delegateBySig(this.signers.alice, delegatee.address, this.comp, nonce, expiry);

    // Cannot use invalid signature when delegating by sig
    await expect(this.comp.delegateBySig(delegatee, nonce, expiry, 30, r, s)).to.be.revertedWith(
      "Comp::delegateBySig: invalid signature",
    );
  });

  it("cannot delegate votes if signature has expired", async function () {
    const delegatee = this.signers.bob;
    const nonce = 0;
    let latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 100;
    const [v, r, s] = await delegateBySig(this.signers.alice, delegatee.address, this.comp, nonce, expiry);

    ethers.provider.send("evm_increaseTime", ["0xffff"]);

    await expect(this.comp.connect(delegatee).delegateBySig(delegatee, nonce, expiry, v, r, s)).to.be.revertedWith(
      "Comp::delegateBySig: signature expired",
    );
  });

  it("cannot request votes if blocktime is equal to current blocktime", async function () {
    let blockNumber = await ethers.provider.getBlockNumber();

    await expect(this.comp.getPriorVotes(this.signers.alice, blockNumber + 1)).to.be.revertedWithCustomError(
      this.comp,
      "BlockNumberEqualOrHigherThanCurrentBlock",
    );

    const newAllowedContract = "0x9d3e06a2952dc49EDCc73e41C76645797fC53967";

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
    // GovernorAlpha.test.ts contains tests that use this function.
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

    expect(await this.comp.numCheckpoints(this.signers.alice.address)).to.be.equal(0n);
    expect(await this.comp.numCheckpoints(this.signers.bob.address)).to.be.equal(1n);
    expect(await this.comp.numCheckpoints(this.signers.carol.address)).to.be.equal(1n);

    expect(await reencryptCurrentVotes(this.signers, this.instances, "bob", this.comp, this.compAddress)).to.equal(0);

    expect(await reencryptCurrentVotes(this.signers, this.instances, "carol", this.comp, this.compAddress)).to.equal(
      parseUnits(String(10_000_000), 6),
    );
  });
});