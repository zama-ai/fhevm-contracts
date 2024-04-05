import { expect } from "chai";
import { ethers, network } from "hardhat";

import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { createTransaction, waitNBlocks } from "../utils";
import { deployCompFixture } from "./Comp.fixture";
import { deployGovernorZamaFixture, deployTimelockFixture } from "./GovernorZama.fixture";

describe("GovernorZama", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    this.comp = await deployCompFixture();
    const instancesComp = await createInstances(await this.comp.getAddress(), ethers, this.signers);
    const encryptedAmountToTransfer = instancesComp.alice.encrypt64(500_000n * 10n ** 6n);
    const transfer1 = await this.comp["transfer(address,bytes)"](this.signers.bob.address, encryptedAmountToTransfer);
    await transfer1.wait();
    const transfer2 = await this.comp["transfer(address,bytes)"](this.signers.carol.address, encryptedAmountToTransfer);
    await transfer2.wait();

    const delegate1 = await this.comp.delegate(this.signers.alice);
    const delegate2 = await this.comp.connect(this.signers.bob).delegate(this.signers.bob);
    const delegate3 = await this.comp.connect(this.signers.carol).delegate(this.signers.carol);
    await Promise.all([delegate1, delegate2, delegate3]);
    await waitNBlocks(1);

    const precomputedGovernorAddress = ethers.getCreateAddress({
      from: this.signers.alice.address,
      nonce: (await this.signers.alice.getNonce()) + 1,
    });

    this.timelock = await deployTimelockFixture(precomputedGovernorAddress);

    const governor = await deployGovernorZamaFixture(this.comp, this.timelock);
    this.contractAddress = await governor.getAddress();

    this.governor = governor;
    this.instances = await createInstances(this.contractAddress, ethers, this.signers);

    const transaction = await this.comp.setAllowedContract(this.contractAddress);
    await transaction.wait();
  });

  it("could not deploy timelock contract if delay is below 2 days or above 31 days", async function () {
    const timelockFactory = await ethers.getContractFactory("Timelock");

    if (network.name === "hardhat") {
      await expect(
        timelockFactory.connect(this.signers.alice).deploy(this.signers.alice.address, 60 * 60 * 24 * 1),
      ).to.be.revertedWith("Timelock::constructor: Delay must exceed minimum delay."); // 1 day < 2 days
      await expect(
        timelockFactory.connect(this.signers.alice).deploy(this.signers.alice.address, 60 * 60 * 24 * 31),
      ).to.be.revertedWith("Timelock::setDelay: Delay must not exceed maximum delay."); // 31 days > 30 days
    } else {
      // fhevm-mode
      await expect(timelockFactory.connect(this.signers.alice).deploy(this.signers.alice.address, 60 * 60 * 24 * 1)).to
        .throw;
      await expect(timelockFactory.connect(this.signers.alice).deploy(this.signers.alice.address, 60 * 60 * 24 * 31)).to
        .throw;
    }
  });

  it("should propose a vote", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );
    const txproposal = await tx.wait();
    expect(txproposal?.status).to.equal(1);
    const proposalId = await this.governor.latestProposalIds(this.signers.alice.address);
    const proposals = await this.governor.getProposalInfo(proposalId);
    expect(proposals.id).to.equal(proposalId);
    expect(proposals.proposer).to.equal(this.signers.alice.address);

    const actions = await this.governor.getActions(1);
    expect(actions[0][0]).to.equal(this.signers.alice.address);
    expect(actions[1][0]).to.equal(0);
    expect(actions[2][0]).to.equal("getBalanceOf(address)");
    expect(actions[3][0]).to.equal(callDatas[0]);
  });

  it("should vote and return a Succeed", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );
    const txproposal = await tx.wait();
    expect(txproposal?.status).to.equal(1);

    const proposalId = await this.governor.latestProposalIds(this.signers.alice.address);

    await waitNBlocks(2);
    // Cast some votes
    const encryptedSupportBob = this.instances.bob.encryptBool(true);
    const txVoteBob = await createTransaction(
      this.governor.connect(this.signers.bob)["castVote(uint256,bytes)"],
      proposalId,
      encryptedSupportBob,
    );
    // bob can get his receipt

    const encryptedSupportCarol = this.instances.carol.encryptBool(true);
    const txVoteCarol = await createTransaction(
      this.governor.connect(this.signers.carol)["castVote(uint256,bytes)"],
      proposalId,
      encryptedSupportCarol,
    );

    const [bobResults, carolResults] = await Promise.all([txVoteBob.wait(), txVoteCarol.wait()]);
    expect(bobResults?.status).to.equal(1);
    expect(carolResults?.status).to.equal(1);

    await waitNBlocks(4);

    const state = await this.governor.state(proposalId);
    expect(state).to.equal(4n);
  });

  it("should vote and return a Defeated ", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );
    const proposal = await tx.wait();
    expect(proposal?.status).to.equal(1);
    const proposalId = await this.governor.latestProposalIds(this.signers.alice.address);
    await waitNBlocks(2);

    // Cast some votes
    const encryptedSupportBob = this.instances.bob.encryptBool(false);
    const txVoteBob = await createTransaction(
      this.governor.connect(this.signers.bob)["castVote(uint256,bytes)"],
      proposalId,
      encryptedSupportBob,
    );

    const encryptedSupportCarol = this.instances.carol.encryptBool(true);
    const txVoteCarol = await createTransaction(
      this.governor.connect(this.signers.carol)["castVote(uint256,bytes)"],
      proposalId,
      encryptedSupportCarol,
    );

    const [bobResults, aliceResults] = await Promise.all([txVoteBob.wait(), txVoteCarol.wait()]);
    expect(bobResults?.status).to.equal(1);
    expect(aliceResults?.status).to.equal(1);
    await waitNBlocks(4);

    const state = await this.governor.state(proposalId);
    expect(state).to.equal(3n);

    // cannot queue defeated proposal
    await expect(this.governor.queue(1)).to.throw;
  });

  it("should cancel", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );
    const proposal = await tx.wait();
    expect(proposal?.status).to.equal(1);
    const proposalId = await this.governor.latestProposalIds(this.signers.alice.address);
    await waitNBlocks(2);

    const state = await this.governor.state(proposalId);
    expect(state).to.equal(1n);

    await expect(this.governor.connect(this.signers.dave).cancel(proposalId)).to.throw; // non-guardian or non-proposer is unable to cancel

    const txCancel = await this.governor.cancel(proposalId);
    await txCancel.wait();
    const newState = await this.governor.state(proposalId);
    expect(newState).to.equal(2n);
  });

  it("only guardian could queue setTimelockPendingAdmin then execute it, and then acceptAdmin", async function () {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(latestBlockNumber);
    const expiry = block!.timestamp + 60 * 60 * 24 * 2 + 60;

    const tx = await this.governor.__queueSetTimelockPendingAdmin(this.signers.bob, expiry);
    await tx.wait();
    if (network.name === "hardhat") {
      // hardhat cheatcodes are available only in mocked mode
      await expect(this.governor.__executeSetTimelockPendingAdmin(this.signers.bob, expiry)).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock.",
      );
      await expect(
        this.governor.connect(this.signers.carol).__queueSetTimelockPendingAdmin(this.signers.bob, expiry),
      ).to.be.revertedWith("GovernorAlpha::__queueSetTimelockPendingAdmin: sender must be gov guardian");

      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      await expect(
        this.governor.connect(this.signers.carol).__executeSetTimelockPendingAdmin(this.signers.bob, expiry),
      ).to.be.revertedWith("GovernorAlpha::__executeSetTimelockPendingAdmin: sender must be gov guardian");
      const tx3 = await this.governor.__executeSetTimelockPendingAdmin(this.signers.bob, expiry);
      await tx3.wait();

      await expect(this.timelock.acceptAdmin()).to.be.revertedWith(
        "Timelock::acceptAdmin: Call must come from pendingAdmin.",
      );
      const tx4 = await this.timelock.connect(this.signers.bob).acceptAdmin();
      await tx4.wait();

      const latestBlockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(latestBlockNumber);
      const expiry2 = block!.timestamp + 60 * 60 * 24 * 2 + 60;
      const timeLockAdd = await this.timelock.getAddress();
      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.contractAddress]);
      const tx5 = await this.timelock
        .connect(this.signers.bob)
        .queueTransaction(timeLockAdd, 0, "setPendingAdmin(address)", callData, expiry2);
      await tx5.wait();
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      const tx6 = await this.timelock
        .connect(this.signers.bob)
        .executeTransaction(timeLockAdd, 0, "setPendingAdmin(address)", callData, expiry2);
      await tx6.wait();
      await expect(this.governor.connect(this.signers.bob).__acceptAdmin()).to.be.revertedWith(
        "GovernorAlpha::__acceptAdmin: sender must be gov guardian",
      );
      const tx7 = await this.governor.__acceptAdmin();
      await tx7.wait();
      expect(await this.timelock.admin()).to.eq(this.contractAddress);
    }
  });

  it("only guardian can call __abdicate", async function () {
    await expect(this.governor.connect(this.signers.bob).__abdicate()).to.throw;
    const tx = await this.governor.__abdicate();
    await tx.wait();
  });

  it("user can't propose if his votes are below the minimal threshold", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    if (network.name === "hardhat") {
      await expect(
        createTransaction(
          this.governor.connect(this.signers.dave).propose,
          [this.signers.alice],
          ["0"],
          ["getBalanceOf(address)"],
          callDatas,
          "do nothing",
        ),
      ).to.be.revertedWith("GovernorAlpha::propose: proposer votes below proposal threshold");
    } else {
      await expect(
        createTransaction(
          this.governor.connect(this.signers.dave).propose,
          [this.signers.alice],
          ["0"],
          ["getBalanceOf(address)"],
          callDatas,
          "do nothing",
        ),
      ).to.throw;
    }
  });

  it("all arrays of a proposal should be of same length, non null and less than max operations", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    await expect(
      createTransaction(
        this.governor.propose,
        [this.signers.alice, this.signers.bob],
        ["0"],
        ["getBalanceOf(address)"],
        callDatas,
        "do nothing",
      ),
    ).to.throw;

    await expect(createTransaction(this.governor.propose, [], [], [], [], "do nothing")).to.throw;

    await expect(
      createTransaction(
        this.governor.propose,
        new Array(11).fill(this.signers.alice),
        new Array(11).fill("0"),
        new Array(11).fill("getBalanceOf(address)"),
        new Array(11).fill(callDatas[0]),
        "do nothing",
      ),
    ).to.throw;
  });

  it("proposer cannot make a new proposal while he still has an already pending or active proposal", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );
    await tx.wait();

    await expect(
      createTransaction(
        this.governor.propose,
        [this.signers.bob],
        ["0"],
        ["getBalanceOf(address)"],
        callDatas,
        "do nothing",
      ),
    ).to.throw;

    await waitNBlocks(1);

    await expect(
      createTransaction(
        this.governor.propose,
        [this.signers.bob],
        ["0"],
        ["getBalanceOf(address)"],
        callDatas,
        "do nothing",
      ),
    ).to.throw;

    const tx2 = await createTransaction(this.governor.connect(this.signers.bob).cancel, 1);
    await tx2.wait();

    await waitNBlocks(1);

    const tx3 = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );
    await tx3.wait();

    expect(await this.governor.latestProposalIds(this.signers.alice)).to.equal(2);

    await expect(this.governor.state(0)).to.be.revertedWith("GovernorAlpha::state: invalid proposal id");
    await expect(this.governor.state(10)).to.be.revertedWith("GovernorAlpha::state: invalid proposal id");
    expect(await this.governor.state(1)).to.equal(2);
    expect(await this.governor.state(2)).to.equal(0);
  });

  it("can propose, then vote once, then queue, then execute", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );

    await tx.wait();

    await waitNBlocks(2);
    const encryptedSupportBob = this.instances.bob.encryptBool(true);
    const txVoteBob = await createTransaction(
      this.governor.connect(this.signers.bob)["castVote(uint256,bytes)"],
      1,
      encryptedSupportBob,
    );
    await txVoteBob.wait();

    await expect(
      createTransaction(this.governor.connect(this.signers.bob)["castVote(uint256,bytes)"], 1, encryptedSupportBob),
    ).to.throw; // cannot vote twice

    await waitNBlocks(5);

    const encryptedSupportAlice = this.instances.alice.encryptBool(true);
    await expect(
      createTransaction(this.governor.connect(this.signers.alice)["castVote(uint256,bytes)"], 1, encryptedSupportAlice),
    ).to.throw; // voting is closed after voting period

    if (network.name === "hardhat") {
      const txQueue = await this.governor.queue(1);
      await txQueue.wait();
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);
      const txExecute = await this.governor.execute(1);
      await txExecute.wait();

      // cannot cancel executed proposal
      await expect(this.governor.cancel(1)).to.be.revertedWith(
        "GovernorAlpha::cancel: cannot cancel executed proposal",
      );

      await expect(this.governor.getProposalInfo(2)).to.be.revertedWith("Invalid proposalId");
    }
  });

  it("cannot queue two identical transactions at same eta", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];

    if (network.name === "hardhat") {
      // mocked mode
      const tx1 = await this.governor.propose(
        [this.signers.alice, this.signers.alice],
        ["0", "0"],
        ["getBalanceOf(address)", "getBalanceOf(address)"],
        new Array(2).fill(callDatas[0]),
        "do nothing",
        {
          gasLimit: 500_000,
        },
      );
      await tx1.wait();

      await waitNBlocks(1);
      const encryptedSupportBob = this.instances.bob.encryptBool(true);
      const txVoteBob = await createTransaction(
        this.governor.connect(this.signers.bob)["castVote(uint256,bytes)"],
        1,
        encryptedSupportBob,
      );
      await txVoteBob.wait();

      await waitNBlocks(5);

      await expect(this.governor.queue(1)).to.be.revertedWith(
        "GovernorAlpha::_queueOrRevert: proposal action already queued at eta",
      );
      await expect(this.governor.execute(1)).to.be.revertedWith(
        "GovernorAlpha::execute: proposal can only be executed if it is queued",
      ); // cannot execute non-queued proposal
    }
  });

  it("proposal expires after grace period", async function () {
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );

    await tx.wait();

    await waitNBlocks(2);
    const encryptedSupportBob = this.instances.bob.encryptBool(true);
    const txVoteBob = await createTransaction(
      this.governor.connect(this.signers.bob)["castVote(uint256,bytes)"],
      1,
      encryptedSupportBob,
    );
    await txVoteBob.wait();

    if (network.name === "hardhat") {
      await waitNBlocks(5);
      const txQueue = await this.governor.queue(1);
      await txQueue.wait();
      await ethers.provider.send("evm_increaseTime", ["0xffffff"]);
      await waitNBlocks(1);
      await expect(this.governor.execute(1)).to.be.revertedWith(
        "GovernorAlpha::execute: proposal can only be executed if it is queued",
      );
      expect(await this.governor.state(1)).to.equal(6);
    }
  });

  it("voter can get his receipt via reencryption", async function () {
    const aliceToken = this.instances.alice.getPublicKey(this.contractAddress);
    const callDatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.alice.address])];
    const tx = await createTransaction(
      this.governor.propose,
      [this.signers.alice],
      ["0"],
      ["getBalanceOf(address)"],
      callDatas,
      "do nothing",
    );
    await tx.wait();

    await waitNBlocks(2);
    // Cast some votes
    const encryptedSupportAlice = this.instances.alice.encryptBool(true);
    const tx2 = await createTransaction(this.governor["castVote(uint256,bytes)"], 1, encryptedSupportAlice);
    await tx2.wait();

    const encryptedAliceVotes = await this.governor.getMyReceipt(1, aliceToken.publicKey, aliceToken.signature);
    // Decrypt Alice's balance
    const aliceVotes = this.instances.alice.decrypt(this.contractAddress, encryptedAliceVotes[2]);
    expect(aliceVotes).to.equal(9_000_000n * 10n ** 6n);

    await expect(
      this.governor.connect(this.signers.bob).getMyReceipt(1, aliceToken.publicKey, aliceToken.signature),
    ).to.be.revertedWith("EIP712 signer and transaction signer do not match");
  });
});
