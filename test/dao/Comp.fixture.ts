import { ethers } from "hardhat";

import type { Comp } from "../../types";
import { reencryptEuint64 } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployCompFixture(signers: Signers): Promise<Comp> {
  const contractFactory = await ethers.getContractFactory("Comp");
  const contract = await contractFactory.connect(signers.alice).deploy(signers.alice.address);
  await contract.waitForDeployment();
  return contract;
}

export async function reencryptCurrentVotes(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  comp: Comp,
  compAddress: string,
): Promise<bigint> {
  const voteHandle = await comp.getCurrentVotes(signers[user as keyof Signers].address);
  const vote = await reencryptEuint64(signers, instances, user, voteHandle, compAddress);
  return vote;
}

export async function reencryptPriorVotes(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  blockNumber: number,
  comp: Comp,
  compAddress: string,
): Promise<bigint> {
  const voteHandle = await comp.getPriorVotes(signers[user as keyof Signers].address, blockNumber);
  const vote = await reencryptEuint64(signers, instances, user, voteHandle, compAddress);
  return vote;
}
