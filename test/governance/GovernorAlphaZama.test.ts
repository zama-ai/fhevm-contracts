import { expect } from "chai";
import { parseUnits } from "ethers";
import { ethers, network } from "hardhat";

import { awaitAllDecryptionResults } from "../asyncDecrypt";
import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { mineNBlocks } from "../utils";
import { deployCompFixture, transferTokensAndDelegate } from "./Comp.fixture";
import {
  deployGovernorAlphaZamaFixture,
  deployTimelockFixture,
  reencryptVoteReceipt,
} from "./GovernorAlphaZama.fixture";

describe("GovernorAlphaZama", function () {
  before(async function () {
    await initSigners(4);
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const contract = await deployCompFixture(this.signers);
    this.comp = contract;
    this.compAddress = await contract.getAddress();
    this.instances = await createInstances(this.signers);

    const precomputedGovernorAddress = ethers.getCreateAddress({
      from: this.signers.alice.address,
      nonce: (await this.signers.alice.getNonce()) + 1,
    });

    const timelock = await deployTimelockFixture(precomputedGovernorAddress);
    this.timelock = timelock;
    this.timelockAddress = await timelock.getAddress();

    const governor = await deployGovernorAlphaZamaFixture(this.signers, this.compAddress, this.timelockAddress);
    this.governor = governor;
    this.governorAddress = await governor.getAddress();

    const tx = await this.comp.setGovernor(this.governorAddress);
    await tx.wait();

    this.VOTING_DELAY = await this.governor.VOTING_DELAY();
    this.VOTING_PERIOD = await this.governor.VOTING_PERIOD();
    this.TIMELOCK_DELAY = await this.timelock.delay();
  });

  it("can propose a vote that becomes active if votes match the token threshold", async function () {
    const transferAmount = parseUnits(String(500_000), 6);
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    const blockNumber = BigInt(await ethers.provider.getBlockNumber());

    const tx = await this.governor
      .connect(this.signers.bob)
      .propose(targets, values, signatures, calldatas, description);

    await expect(tx)
      .to.emit(this.governor, "ProposalCreated")
      .withArgs(
        BigInt(1),
        this.signers.bob.address,
        targets,
        values,
        signatures,
        calldatas,
        blockNumber + this.VOTING_DELAY + BigInt(1), // @dev We add one since the transaction incremented the block number
        blockNumber + this.VOTING_DELAY + this.VOTING_PERIOD + BigInt(1),
        description,
      );

    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);
    let proposalInfo = await this.governor.getProposalInfo(proposalId);

    // @dev .to.eql is used to compare array elements
    expect(proposalInfo.proposer).to.equal(this.signers.bob.address);
    expect(proposalInfo.targets).to.eql(targets);
    expect(proposalInfo.signatures).to.eql(signatures);
    expect(proposalInfo.calldatas).to.eql(calldatas);
    // 1 ==> PendingThresholdVerification
    expect(proposalInfo.state).to.equal(1);

    await awaitAllDecryptionResults();

    proposalInfo = await this.governor.getProposalInfo(proposalId);
    // 3 ==> Active
    expect(proposalInfo.state).to.equal(3);
  });

  it("anyone can propose a vote but it is rejected if votes are below the token threshold", async function () {
    const transferAmount = (await this.governor.PROPOSAL_THRESHOLD()) - BigInt(1);
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    const tx = await this.governor
      .connect(this.signers.bob)
      .propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);
    let proposalInfo = await this.governor.getProposalInfo(proposalId);
    expect(proposalInfo.proposer).to.equal(this.signers.bob.address);

    // 1 ==> PendingThresholdVerification
    expect(proposalInfo.state).to.equal(1);
    await awaitAllDecryptionResults();

    proposalInfo = await this.governor.getProposalInfo(proposalId);

    await awaitAllDecryptionResults();

    // 2 ==> Rejected
    expect(proposalInfo.state).to.equal(2);
  });

  it("multiple users can vote and the vote succeeds if forVotes > quorum", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = parseUnits(String(200_000), 6);

    // Bob and Carol receive 200k tokens and delegate to themselves.
    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "carol",
      "carol",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    // Bob and Carol vote for
    let input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    let encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);

    await expect(tx).to.emit(this.governor, "VoteCast").withArgs(
      this.signers.bob,
      BigInt(1), // @dev proposalId
    );

    input = this.instances.carol.createEncryptedInput(this.governorAddress, this.signers.carol.address);
    input.addBool(true);
    encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.carol)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);

    await expect(tx).to.emit(this.governor, "VoteCast").withArgs(
      this.signers.carol,
      BigInt(1), // @dev proposalId
    );

    // Bob/Carol can reeencrypt his/her receipt
    let [hasVoted, support, votes] = await reencryptVoteReceipt(
      this.signers,
      this.instances,
      proposalId,
      "bob",
      this.governor,
      this.governorAddress,
    );

    expect(hasVoted).to.be.eq(true);
    expect(support).to.be.eq(true);
    expect(votes).to.be.eq(transferAmount);

    [hasVoted, support, votes] = await reencryptVoteReceipt(
      this.signers,
      this.instances,
      proposalId,
      "carol",
      this.governor,
      this.governorAddress,
    );

    expect(hasVoted).to.be.eq(true);
    expect(support).to.be.eq(true);
    expect(votes).to.be.eq(transferAmount);

    // Mine blocks
    await mineNBlocks(3);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);
    await tx.wait();

    let proposalInfo = await this.governor.getProposalInfo(proposalId);
    expect(proposalInfo.forVotes).to.be.eq(parseUnits(String(0), 6));
    expect(proposalInfo.againstVotes).to.be.eq(parseUnits(String(0), 6));
    // 4 ==> Succeeded
    expect(proposalInfo.state).to.equal(4);

    // POST-DECRYPTION RESULTS
    await awaitAllDecryptionResults();
    proposalInfo = await this.governor.getProposalInfo(proposalId);
    expect(proposalInfo.forVotes).to.be.eq(transferAmount * BigInt(2));
    expect(proposalInfo.againstVotes).to.be.eq(parseUnits(String(0), 6));
    // 7 ==> Succeeded
    expect(proposalInfo.state).to.equal(7);

    const block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    let nextBlockTimestamp: BigInt;

    if (block === null) {
      throw "Block is null. Check RPC config.";
    } else {
      nextBlockTimestamp = BigInt(block.timestamp) + BigInt(30);
    }

    await ethers.provider.send("evm_setNextBlockTimestamp", [nextBlockTimestamp.toString()]);

    // QUEUING
    tx = await this.governor.queue(proposalId);
    await expect(tx)
      .to.emit(this.governor, "ProposalQueued")
      .withArgs(
        BigInt(1), // @dev proposalId,
        nextBlockTimestamp + this.TIMELOCK_DELAY,
      );

    proposalInfo = await this.governor.getProposalInfo(proposalId);
    // 8 ==> Queued
    expect(proposalInfo.state).to.equal(8);
    const eta = proposalInfo.eta;
    expect(eta).to.equal(nextBlockTimestamp + this.TIMELOCK_DELAY);

    // EXECUTE
    await ethers.provider.send("evm_setNextBlockTimestamp", [eta.toString()]);
    tx = await this.governor.execute(proposalId);
    await expect(tx).to.emit(this.governor, "ProposalExecuted").withArgs(
      BigInt(1), // @dev proposalId
    );

    proposalInfo = await this.governor.getProposalInfo(proposalId);
    // 10 ==> Executed
    expect(proposalInfo.state).to.equal(10);
  });

  it("vote is defeated if forVotes < quorum", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = (await this.governor.QUORUM_VOTES()) - BigInt(1);

    // Bob receives enough to create a proposal but not enough to match the quorum.
    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    const input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    const encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Bob reeencrypts his receipt
    const [hasVoted, support, votes] = await reencryptVoteReceipt(
      this.signers,
      this.instances,
      proposalId,
      "bob",
      this.governor,
      this.governorAddress,
    );

    expect(hasVoted).to.be.eq(true);
    expect(support).to.be.eq(true);
    expect(votes).to.be.eq(transferAmount);

    // Mine blocks
    await mineNBlocks(4);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);

    await tx.wait();
    let proposalInfo = await this.governor.getProposalInfo(proposalId);
    expect(proposalInfo.forVotes).to.be.eq(parseUnits(String(0), 6));
    expect(proposalInfo.againstVotes).to.be.eq(parseUnits(String(0), 6));
    // 4 ==> Succeeded
    expect(proposalInfo.state).to.equal(4);

    // POST-DECRYPTION RESULTS
    await awaitAllDecryptionResults();
    proposalInfo = await this.governor.getProposalInfo(proposalId);
    expect(proposalInfo.forVotes).to.be.eq(transferAmount);
    expect(proposalInfo.againstVotes).to.be.eq(parseUnits(String(0), 6));

    // 6 ==> Defeated
    expect(proposalInfo.state).to.equal(6);
  });

  it("vote is rejected if forVotes <= againstVotes", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmountFor = parseUnits(String(500_000), 6);
    const transferAmountAgainst = transferAmountFor;

    // Bob and Carol receive 200k tokens and delegate to themselves.
    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmountFor,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmountAgainst,
      "carol",
      "carol",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    // Bob votes for but Carol votes against
    let input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    let encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    input = this.instances.carol.createEncryptedInput(this.governorAddress, this.signers.carol.address);
    input.addBool(false);
    encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.carol)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Bob/Carol can reeencrypt his/her receipt
    let [hasVoted, support, votes] = await reencryptVoteReceipt(
      this.signers,
      this.instances,
      proposalId,
      "bob",
      this.governor,
      this.governorAddress,
    );

    expect(hasVoted).to.be.eq(true);
    expect(support).to.be.eq(true);
    expect(votes).to.be.eq(transferAmountFor);

    [hasVoted, support, votes] = await reencryptVoteReceipt(
      this.signers,
      this.instances,
      proposalId,
      "carol",
      this.governor,
      this.governorAddress,
    );

    expect(hasVoted).to.be.eq(true);
    expect(support).to.be.eq(false);
    expect(votes).to.be.eq(transferAmountAgainst);

    // Mine blocks
    await mineNBlocks(3);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);
    await tx.wait();
    let proposalInfo = await this.governor.getProposalInfo(proposalId);
    expect(proposalInfo.forVotes).to.be.eq(parseUnits(String(0), 6));
    expect(proposalInfo.againstVotes).to.be.eq(parseUnits(String(0), 6));
    // 4 ==> Succeeded
    expect(proposalInfo.state).to.equal(4);

    // POST-DECRYPTION RESULTS
    await awaitAllDecryptionResults();
    proposalInfo = await this.governor.getProposalInfo(proposalId);
    expect(proposalInfo.forVotes).to.be.eq(transferAmountFor);
    expect(proposalInfo.againstVotes).to.be.eq(transferAmountAgainst);
    // 6 ==> Defeated
    expect(proposalInfo.state).to.equal(6);
  });

  it("only owner could queue setTimelockPendingAdmin then execute it, and then acceptTimelockAdmin", async function () {
    const block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    let expiry;

    if (block === null) {
      throw "Block is null. Check RPC config.";
    } else {
      expiry = BigInt(block.timestamp) + this.TIMELOCK_DELAY + BigInt(1);
    }

    const tx = await this.governor.queueSetTimelockPendingAdmin(this.signers.bob, expiry);
    await tx.wait();

    if (network.name === "hardhat") {
      // hardhat cheatcodes are available only in mocked mode
      await expect(
        this.governor.executeSetTimelockPendingAdmin(this.signers.bob, expiry),
      ).to.be.revertedWithCustomError(this.timelock, "TransactionTooEarlyForExecution");

      await expect(
        this.governor.connect(this.signers.carol).queueSetTimelockPendingAdmin(this.signers.bob, expiry),
      ).to.be.revertedWithCustomError(this.governor, "OwnableUnauthorizedAccount");

      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);

      await expect(
        this.governor.connect(this.signers.carol).executeSetTimelockPendingAdmin(this.signers.bob, expiry),
      ).to.be.revertedWithCustomError(this.governor, "OwnableUnauthorizedAccount");

      const tx3 = await this.governor.executeSetTimelockPendingAdmin(this.signers.bob, expiry);
      await tx3.wait();

      await expect(this.timelock.acceptAdmin()).to.be.revertedWithCustomError(this.timelock, "SenderIsNotPendingAdmin");

      const tx4 = await this.timelock.connect(this.signers.bob).acceptAdmin();
      await tx4.wait();

      const latestBlockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(latestBlockNumber);

      let expiry2;
      if (block === null) {
        throw "Block is null. Check RPC config.";
      } else {
        expiry2 = BigInt(block.timestamp) + this.TIMELOCK_DELAY + BigInt(1);
      }

      const timeLockAdd = this.timelockAddress;
      const callData = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.governorAddress]);
      const tx5 = await this.timelock
        .connect(this.signers.bob)
        .queueTransaction(timeLockAdd, 0, "setPendingAdmin(address)", callData, expiry2);
      await tx5.wait();
      await ethers.provider.send("evm_increaseTime", ["0x2a33c"]);

      const tx6 = await this.timelock
        .connect(this.signers.bob)
        .executeTransaction(timeLockAdd, 0, "setPendingAdmin(address)", callData, expiry2);

      await tx6.wait();

      await expect(this.governor.connect(this.signers.bob).acceptTimelockAdmin()).to.be.revertedWithCustomError(
        this.governor,
        "OwnableUnauthorizedAccount",
      );

      const tx7 = await this.governor.acceptTimelockAdmin();
      await tx7.wait();
      expect(await this.timelock.admin()).to.eq(this.governorAddress);
    }
  });

  it("all arrays of a proposal should be of same length, non null and less than max operations", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";

    const invalidTargets = [this.signers.bob.address, this.signers.carol.address];
    await expect(
      this.governor.connect(this.signers.alice).propose(invalidTargets, values, signatures, calldatas, description),
    ).to.be.revertedWithCustomError(this.governor, "LengthsDoNotMatch");

    const invalidValues = ["0", "0"];
    await expect(
      this.governor.connect(this.signers.alice).propose(targets, invalidValues, signatures, calldatas, description),
    ).to.be.revertedWithCustomError(this.governor, "LengthsDoNotMatch");

    const invalidSignatures = ["getBalanceOf(address)", "getBalanceOf(address)"];
    await expect(
      this.governor.connect(this.signers.alice).propose(targets, values, invalidSignatures, calldatas, description),
    ).to.be.revertedWithCustomError(this.governor, "LengthsDoNotMatch");

    const invalidCalldatas = [
      ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address]),
      ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address]),
    ];

    await expect(
      this.governor.connect(this.signers.alice).propose(targets, values, signatures, invalidCalldatas, description),
    ).to.be.revertedWithCustomError(this.governor, "LengthsDoNotMatch");

    await expect(
      this.governor.connect(this.signers.alice).propose([], [], [], [], description),
    ).to.be.revertedWithCustomError(this.governor, "LengthIsNull");

    await expect(
      this.governor
        .connect(this.signers.alice)
        .propose(
          new Array(11).fill(this.signers.alice),
          new Array(11).fill("0"),
          new Array(11).fill("getBalanceOf(address)"),
          new Array(11).fill(calldatas[0]),
          description,
        ),
    ).to.be.revertedWithCustomError(this.governor, "LengthAboveMaxOperations");
  });

  it("only gateway can call gateway functions", async function () {
    await expect(this.governor.connect(this.signers.bob).callbackInitiateProposal(1, true)).to.be.reverted;
    await expect(this.governor.connect(this.signers.bob).callbackVoteDecryption(1, 10, 10)).to.be.reverted;
  });

  it("only owner can call owner functions", async function () {
    await expect(this.governor.connect(this.signers.bob).acceptTimelockAdmin()).to.be.revertedWithCustomError(
      this.governor,
      "OwnableUnauthorizedAccount",
    );

    await expect(
      this.governor.connect(this.signers.bob).executeSetTimelockPendingAdmin(this.signers.bob.address, 1111),
    ).to.be.revertedWithCustomError(this.governor, "OwnableUnauthorizedAccount");

    await expect(
      this.governor.connect(this.signers.bob).queueSetTimelockPendingAdmin(this.signers.bob.address, 1111),
    ).to.be.revertedWithCustomError(this.governor, "OwnableUnauthorizedAccount");
  });

  it("only owner or proposer can cancel proposal", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    const tx = await this.governor
      .connect(this.signers.bob)
      .propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // @dev ProposalId starts at 1.
    await expect(this.governor.connect(this.signers.carol).cancel(1)).to.be.revertedWithCustomError(
      this.governor,
      "OwnableUnauthorizedAccount",
    );
  });

  it("proposer cannot make a new proposal while he still has an already pending or active proposal", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    const tx = await this.governor
      .connect(this.signers.bob)
      .propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    await expect(
      this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description),
    ).to.be.revertedWithCustomError(this.governor, "ProposerHasAnotherProposal");
  });

  it("cannot queue twice or execute before queuing", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    // Bob receives 400k tokens and delegates to himself.
    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    // Bob casts a vote
    const input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    const encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Mine blocks
    await mineNBlocks(4);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);
    await tx.wait();

    // POST-DECRYPTION RESULTS
    await awaitAllDecryptionResults();

    // QUEUING
    // @dev Cannot execute before queuing.
    await expect(this.governor.execute(proposalId)).to.be.revertedWithCustomError(
      this.governor,
      "ProposalStateInvalid",
    );

    tx = await this.governor.queue(proposalId);
    await tx.wait();

    // @dev Cannot queue twice.
    await expect(this.governor.queue(proposalId)).to.be.revertedWithCustomError(this.governor, "ProposalStateInvalid");
  });

  it("cannot cancel if state is Rejected/Defeated/Executed/Canceled", async function () {
    let transferAmount = (await this.governor.PROPOSAL_THRESHOLD()) - BigInt(1);
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";

    // CANNOT CANCEL IF REJECTED
    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();
    await awaitAllDecryptionResults();

    let proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    await expect(this.governor.connect(this.signers.bob).cancel(proposalId)).to.be.revertedWithCustomError(
      this.governor,
      "ProposalStateInvalid",
    );

    // CANNOT CANCEL IF DEFEATED
    transferAmount = (await this.governor.QUORUM_VOTES()) - BigInt(1);

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "carol",
      "carol",
      this.comp,
      this.compAddress,
    );

    tx = await this.governor.connect(this.signers.carol).propose(targets, values, signatures, calldatas, description);
    await tx.wait();
    await awaitAllDecryptionResults();

    proposalId = await this.governor.latestProposalIds(this.signers.carol.address);

    let input = this.instances.carol.createEncryptedInput(this.governorAddress, this.signers.carol.address);
    input.addBool(true);
    let encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.carol)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Mine blocks
    await mineNBlocks(4);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);
    await tx.wait();
    await awaitAllDecryptionResults();
    await expect(this.governor.connect(this.signers.carol).cancel(proposalId)).to.be.revertedWithCustomError(
      this.governor,
      "ProposalStateInvalid",
    );

    // CANNOT CANCEL IF EXECUTED
    transferAmount = await this.governor.QUORUM_VOTES();

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "dave",
      "dave",
      this.comp,
      this.compAddress,
    );

    tx = await this.governor.connect(this.signers.dave).propose(targets, values, signatures, calldatas, description);
    await tx.wait();
    await awaitAllDecryptionResults();

    proposalId = await this.governor.latestProposalIds(this.signers.dave.address);

    input = this.instances.dave.createEncryptedInput(this.governorAddress, this.signers.dave.address);
    input.addBool(true);
    encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.dave)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Mine blocks
    await mineNBlocks(4);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);
    await tx.wait();
    await awaitAllDecryptionResults();

    tx = await this.governor.queue(proposalId);
    await tx.wait();

    const eta = (await this.governor.getProposalInfo(proposalId)).eta;

    // EXECUTE
    await ethers.provider.send("evm_setNextBlockTimestamp", [eta.toString()]);
    tx = await this.governor.execute(proposalId);
    await tx.wait();

    await expect(this.governor.connect(this.signers.dave).cancel(proposalId)).to.be.revertedWithCustomError(
      this.governor,
      "ProposalStateInvalid",
    );

    // CANNOT CANCEL TWICE
    tx = await this.governor.connect(this.signers.carol).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    proposalId = await this.governor.latestProposalIds(this.signers.carol.address);

    tx = await this.governor.connect(this.signers.carol).cancel(proposalId);
    await tx.wait();
    await expect(this.governor.connect(this.signers.carol).cancel(proposalId)).to.be.revertedWithCustomError(
      this.governor,
      "ProposalStateInvalid",
    );
  });

  it("cancel function clears the timelock if the proposal is queued", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    // Bob votes for
    const input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    const encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Mine blocks
    await mineNBlocks(4);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);
    await tx.wait();

    // POST-DECRYPTION RESULTS
    await awaitAllDecryptionResults();

    // QUEUING
    tx = await this.governor.queue(proposalId);
    await tx.wait();

    // @dev Alice is the governor's owner.
    tx = await this.governor.connect(this.signers.alice).cancel(proposalId);
    await expect(tx).to.emit(this.governor, "ProposalCanceled").withArgs(
      BigInt(1), // @dev proposalId
    );

    // 5 ==> Canceled
    expect((await this.governor.getProposalInfo(proposalId)).state).to.equal(5);
  });

  it("cannot request vote decryption if state is not Active or if endBlock >= block.number", async function () {
    await expect(this.governor.connect(this.signers.dave).requestVoteDecryption(0)).to.be.revertedWithCustomError(
      this.governor,
      "ProposalStateInvalid",
    );

    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    // Bob votes for
    const input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    const encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Mine blocks but not enough
    await mineNBlocks(3);

    await expect(
      this.governor.connect(this.signers.dave).requestVoteDecryption(proposalId),
    ).to.be.revertedWithCustomError(this.governor, "ProposalStateStillActive");
  });

  it("cannot cast a vote if state is not Active or if endBlock > block.number", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    const input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    const encryptedVote = await input.encrypt();

    await expect(
      this.governor
        .connect(this.signers.bob)
        ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof),
    ).to.be.revertedWithCustomError(this.governor, "ProposalStateInvalid");

    tx = await this.governor.connect(this.signers.bob).cancel(proposalId);
    await tx.wait();

    tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();
    await awaitAllDecryptionResults();

    const newProposalId = await this.governor.latestProposalIds(this.signers.bob.address);
    // 3 --> Active
    expect((await this.governor.getProposalInfo(newProposalId)).state).to.equal(3);

    // Mine too many blocks so that it becomes too late to cast vote
    await mineNBlocks(5);

    await expect(
      this.governor
        .connect(this.signers.bob)
        ["castVote(uint256,bytes32,bytes)"](newProposalId, encryptedVote.handles[0], encryptedVote.inputProof),
    ).to.be.revertedWithCustomError(this.governor, "ProposalStateNotActive");
  });

  it("cannot cast a vote twice", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    // Bob receives 400k tokens and delegates to himself.
    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    // Bob casts a vote
    const input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    const encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    await expect(
      this.governor
        .connect(this.signers.bob)
        ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof),
    ).to.be.revertedWithCustomError(this.governor, "VoterHasAlreadyVoted");
  });

  it("proposal expires after grace period", async function () {
    const targets = [this.signers.bob.address];
    const values = ["0"];
    const signatures = ["getBalanceOf(address)"];
    const calldatas = [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [this.signers.bob.address])];
    const description = "description";
    const transferAmount = await this.governor.QUORUM_VOTES();

    // Bob receives 400k tokens and delegates to himself.
    await transferTokensAndDelegate(
      this.signers,
      this.instances,
      transferAmount,
      "bob",
      "bob",
      this.comp,
      this.compAddress,
    );

    // INITIATE A PROPOSAL
    let tx = await this.governor.connect(this.signers.bob).propose(targets, values, signatures, calldatas, description);
    await tx.wait();

    // DECRYPTION FOR THE TOKEN THRESHOLD
    await awaitAllDecryptionResults();
    const proposalId = await this.governor.latestProposalIds(this.signers.bob.address);

    // VOTE
    // Bob casts a vote
    const input = this.instances.bob.createEncryptedInput(this.governorAddress, this.signers.bob.address);
    input.addBool(true);
    const encryptedVote = await input.encrypt();
    tx = await this.governor
      .connect(this.signers.bob)
      ["castVote(uint256,bytes32,bytes)"](proposalId, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    // Mine blocks
    await mineNBlocks(4);

    // REQUEST DECRYPTION
    tx = await this.governor.requestVoteDecryption(proposalId);
    await tx.wait();

    // POST-DECRYPTION RESULTS
    await awaitAllDecryptionResults();

    // Proposal is queued
    tx = await this.governor.queue(proposalId);
    await tx.wait();

    let proposalInfo = await this.governor.getProposalInfo(proposalId);
    const eta = proposalInfo.eta;
    const deadlineExecutionTransaction = eta + (await this.timelock.GRACE_PERIOD());

    await ethers.provider.send("evm_setNextBlockTimestamp", [deadlineExecutionTransaction.toString()]);
    await mineNBlocks(1);

    await expect(this.governor.execute(proposalId)).to.be.revertedWithCustomError(
      this.timelock,
      "TransactionTooLateForExecution",
    );

    proposalInfo = await this.governor.getProposalInfo(proposalId);
    // 9 ==> Expired
    expect(proposalInfo.state).to.equal(9);
  });
});
