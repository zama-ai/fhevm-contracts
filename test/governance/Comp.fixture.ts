import { ethers } from "hardhat";

import type { TestComp } from "../../types";
import { reencryptEuint64 } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployCompFixture(signers: Signers): Promise<TestComp> {
  const contractFactory = await ethers.getContractFactory("TestComp");
  const contract = await contractFactory
    .connect(signers.alice)
    .deploy(signers.alice.address, "CompoundZama", "COMP", "1.0");
  await contract.waitForDeployment();
  return contract;
}

export async function transferTokensAndDelegate(
  signers: Signers,
  instances: FhevmInstances,
  transferAmount: bigint,
  account: string,
  delegate: string,
  comp: TestComp,
  compAddress: string,
): Promise<void> {
  const input = instances.alice.createEncryptedInput(compAddress, signers.alice.address);
  input.add64(transferAmount);
  const encryptedTransferAmount = await input.encrypt();

  let tx = await comp
    .connect(signers.alice)
    ["transfer(address,bytes32,bytes)"](
      signers[account as keyof Signers],
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
  await tx.wait();

  tx = await comp.connect(signers[account as keyof Signers]).delegate(signers[delegate as keyof Signers].address);
  await tx.wait();
}

export async function reencryptCurrentVotes(
  signers: Signers,
  instances: FhevmInstances,
  account: string,
  comp: TestComp,
  compAddress: string,
): Promise<bigint> {
  const voteHandle = await comp.getCurrentVotes(signers[account as keyof Signers].address);
  const vote = await reencryptEuint64(signers, instances, account, voteHandle, compAddress);
  return vote;
}

export async function reencryptPriorVotes(
  signers: Signers,
  instances: FhevmInstances,
  account: string,
  blockNumber: number,
  comp: TestComp,
  compAddress: string,
): Promise<bigint> {
  const voteHandle = await comp.getPriorVotes(signers[account as keyof Signers].address, blockNumber);
  const vote = await reencryptEuint64(signers, instances, account, voteHandle, compAddress);
  return vote;
}
