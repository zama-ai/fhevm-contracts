import { Signer } from "ethers";
import { FhevmInstance } from "fhevmjs/node";
import { ethers } from "hardhat";

import type { CompoundTimelock, TestConfidentialGovernorAlpha } from "../../types";
import { reencryptEbool, reencryptEuint64 } from "../reencrypt";

export async function deployTimelockFixture(account: Signer, adminAddress: string): Promise<CompoundTimelock> {
  const timelockFactory = await ethers.getContractFactory("CompoundTimelock");
  const timelock = await timelockFactory.connect(account).deploy(adminAddress, 60 * 60 * 24 * 2);
  await timelock.waitForDeployment();
  return timelock;
}

export async function deployConfidentialGovernorAlphaFixture(
  account: Signer,
  confidentialERC20VotesAddress: string,
  timelockAddress: string,
): Promise<TestConfidentialGovernorAlpha> {
  // @dev We use 5 only for testing purpose.
  // DO NOT use this value in production.
  const votingPeriod = 5;
  // @dev We use 5 minutes for the maximum decryption delay (from the Gateway).
  const maxDecryptionDelay = 60 * 5;
  const governorFactory = await ethers.getContractFactory("TestConfidentialGovernorAlpha");
  const governor = await governorFactory
    .connect(account)
    .deploy(account, timelockAddress, confidentialERC20VotesAddress, votingPeriod, maxDecryptionDelay);
  await governor.waitForDeployment();
  return governor;
}

export async function reencryptVoteReceipt(
  account: Signer,
  instance: FhevmInstance,
  proposalId: bigint,
  governor: TestConfidentialGovernorAlpha,
  governorAddress: string,
): Promise<[boolean, boolean, bigint]> {
  const [hasVoted, supportHandle, voteHandle] = await governor.getReceipt(proposalId, await account.getAddress());
  const support = await reencryptEbool(account, instance, supportHandle, governorAddress);
  const vote = await reencryptEuint64(account, instance, voteHandle, governorAddress);

  return [hasVoted, support, vote];
}
