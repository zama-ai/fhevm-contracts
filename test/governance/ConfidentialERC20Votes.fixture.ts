import { parseUnits } from "ethers";
import { ethers } from "hardhat";

import type { TestConfidentialERC20Votes } from "../../types";
import { reencryptEuint64 } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployConfidentialERC20Votes(signers: Signers): Promise<TestConfidentialERC20Votes> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialERC20Votes");
  const contract = await contractFactory
    .connect(signers.alice)
    .deploy(signers.alice.address, "CompoundZama", "CONFIDENTIAL_ERC20_VOTES", "1.0", parseUnits("10000000", 6));
  await contract.waitForDeployment();
  return contract;
}

export async function transferTokensAndDelegate(
  signers: Signers,
  instances: FhevmInstances,
  transferAmount: bigint,
  account: string,
  delegate: string,
  confidentialERC20Votes: TestConfidentialERC20Votes,
  confidentialERC20VotesAddress: string,
): Promise<void> {
  const input = instances.alice.createEncryptedInput(confidentialERC20VotesAddress, signers.alice.address);
  input.add64(transferAmount);
  const encryptedTransferAmount = await input.encrypt();

  let tx = await confidentialERC20Votes
    .connect(signers.alice)
    [
      "transfer(address,bytes32,bytes)"
    ](signers[account as keyof Signers], encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);
  await tx.wait();

  tx = await confidentialERC20Votes
    .connect(signers[account as keyof Signers])
    .delegate(signers[delegate as keyof Signers].address);
  await tx.wait();
}

export async function reencryptCurrentVotes(
  signers: Signers,
  instances: FhevmInstances,
  account: string,
  confidentialERC20Votes: TestConfidentialERC20Votes,
  confidentialERC20VotesAddress: string,
): Promise<bigint> {
  const voteHandle = await confidentialERC20Votes.getCurrentVotes(signers[account as keyof Signers].address);
  const vote = await reencryptEuint64(signers, instances, account, voteHandle, confidentialERC20VotesAddress);
  return vote;
}

export async function reencryptPriorVotes(
  signers: Signers,
  instances: FhevmInstances,
  account: string,
  blockNumber: number,
  confidentialERC20Votes: TestConfidentialERC20Votes,
  confidentialERC20VotesAddress: string,
): Promise<bigint> {
  const voteHandle = await confidentialERC20Votes.getPriorVotes(signers[account as keyof Signers].address, blockNumber);
  const vote = await reencryptEuint64(signers, instances, account, voteHandle, confidentialERC20VotesAddress);
  return vote;
}
