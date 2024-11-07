import { ethers } from "hardhat";

import type { CompoundTimelock, GovernorAlphaZama } from "../../types";
import { reencryptEbool, reencryptEuint64 } from "../reencrypt";
import { Signers, getSigners } from "../signers";
import { FhevmInstances } from "../types";

export async function deployTimelockFixture(admin: string): Promise<CompoundTimelock> {
  const signers = await getSigners();
  const timelockFactory = await ethers.getContractFactory("CompoundTimelock");
  const timelock = await timelockFactory.connect(signers.alice).deploy(admin, 60 * 60 * 24 * 2);
  await timelock.waitForDeployment();
  return timelock;
}

export async function deployGovernorAlphaZamaFixture(
  signers: Signers,
  compAddress: string,
  timelockAddress: string,
): Promise<GovernorAlphaZama> {
  // @dev We use 5 only for testing purpose.
  // DO NOT use this value in production.
  const votingPeriod = 5;
  const governorFactory = await ethers.getContractFactory("GovernorAlphaZama");
  const governor = await governorFactory
    .connect(signers.alice)
    .deploy(signers.alice.address, timelockAddress, compAddress, votingPeriod);
  await governor.waitForDeployment();
  return governor;
}

export async function reencryptVoteReceipt(
  signers: Signers,
  instances: FhevmInstances,
  proposalId: bigint,
  account: string,
  governor: GovernorAlphaZama,
  governorAddress: string,
): Promise<[boolean, boolean, bigint]> {
  const [hasVoted, supportHandle, voteHandle] = await governor.getReceipt(
    proposalId,
    signers[account as keyof Signers].address,
  );
  const support = await reencryptEbool(signers, instances, account, supportHandle, governorAddress);
  const vote = await reencryptEuint64(signers, instances, account, voteHandle, governorAddress);

  return [hasVoted, support, vote];
}
