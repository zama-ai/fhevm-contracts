import { Signer } from "ethers";
import { FhevmInstance } from "fhevmjs/node";
import { ethers } from "hardhat";

import type { ConfidentialVestingWallet, TestConfidentialVestingWallet } from "../../types";
import { reencryptEuint64 } from "../reencrypt";

export async function deployConfidentialVestingWalletFixture(
  account: Signer,
  beneficiaryAddress: string,
  startTimestamp: bigint,
  duration: bigint,
): Promise<TestConfidentialVestingWallet> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialVestingWallet");
  const contract = await contractFactory.connect(account).deploy(beneficiaryAddress, startTimestamp, duration);
  await contract.waitForDeployment();
  return contract;
}

export async function reencryptReleased(
  account: Signer,
  instance: FhevmInstance,
  tokenAddress: string,
  vestingWallet: ConfidentialVestingWallet,
  vestingWalletAddress: string,
): Promise<bigint> {
  const releasedHandled = await vestingWallet.released(tokenAddress);
  const releasedAmount = await reencryptEuint64(account, instance, releasedHandled, vestingWalletAddress);
  return releasedAmount;
}
