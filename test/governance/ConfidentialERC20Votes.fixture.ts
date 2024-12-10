import { Signer, parseUnits } from "ethers";
import { FhevmInstance } from "fhevmjs/node";
import { ethers } from "hardhat";

import type { TestConfidentialERC20Votes } from "../../types";
import { reencryptEuint64 } from "../reencrypt";

export async function deployConfidentialERC20Votes(account: Signer): Promise<TestConfidentialERC20Votes> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialERC20Votes");
  const contract = await contractFactory
    .connect(account)
    .deploy(await account.getAddress(), "CompoundZama", "CONFIDENTIAL_ERC20_VOTES", "1.0", parseUnits("10000000", 6));
  await contract.waitForDeployment();
  return contract;
}

export async function transferTokensAndDelegate(
  owner: Signer,
  delegator: Signer,
  delegateeAddress: string,
  instance: FhevmInstance,
  transferAmount: bigint,
  confidentialERC20Votes: TestConfidentialERC20Votes,
  confidentialERC20VotesAddress: string,
): Promise<void> {
  const input = instance.createEncryptedInput(confidentialERC20VotesAddress, await owner.getAddress());
  input.add64(transferAmount);
  const encryptedTransferAmount = await input.encrypt();

  let tx = await confidentialERC20Votes
    .connect(owner)
    [
      "transfer(address,bytes32,bytes)"
    ](await delegator.getAddress(), encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);
  await tx.wait();

  tx = await confidentialERC20Votes.connect(delegator).delegate(delegateeAddress);
  await tx.wait();
}

export async function reencryptCurrentVotes(
  account: Signer,
  instance: FhevmInstance,
  confidentialERC20Votes: TestConfidentialERC20Votes,
  confidentialERC20VotesAddress: string,
): Promise<bigint> {
  const voteHandle = await confidentialERC20Votes.getCurrentVotes(await account.getAddress());
  const vote = await reencryptEuint64(account, instance, voteHandle, confidentialERC20VotesAddress);
  return vote;
}

export async function reencryptPriorVotes(
  account: Signer,
  instance: FhevmInstance,
  blockNumber: number,
  confidentialERC20Votes: TestConfidentialERC20Votes,
  confidentialERC20VotesAddress: string,
): Promise<bigint> {
  const voteHandle = await confidentialERC20Votes.getPriorVotes(await account.getAddress(), blockNumber);
  const vote = await reencryptEuint64(account, instance, voteHandle, confidentialERC20VotesAddress);
  return vote;
}
