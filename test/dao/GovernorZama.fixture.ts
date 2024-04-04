import { ethers } from "hardhat";

import { Comp } from "../../types";
import type { GovernorZama, Timelock } from "../../types";
import { getSigners } from "../signers";

export async function deployTimelockFixture(admin: string): Promise<Timelock> {
  const signers = await getSigners();

  const timelockFactory = await ethers.getContractFactory("Timelock");
  const timelock = await timelockFactory.connect(signers.alice).deploy(admin, 60 * 60 * 24 * 2);

  await timelock.waitForDeployment();

  return timelock;
}

export async function deployGovernorZamaFixture(compContract: Comp, timelock: Timelock): Promise<GovernorZama> {
  const signers = await getSigners();
  const votingPeriod = 5; // WARNING: We use 5 only for testing purpose, DO NOT use this value in production, typically it should be at least a few days, default was 3 days originally i.e votingPeriod=21600 blocks if 12s per block
  const governorFactory = await ethers.getContractFactory("GovernorZama");
  const governor = await governorFactory
    .connect(signers.alice)
    .deploy(timelock.getAddress(), compContract.getAddress(), signers.alice.address, votingPeriod);
  await governor.waitForDeployment();

  return governor;
}
