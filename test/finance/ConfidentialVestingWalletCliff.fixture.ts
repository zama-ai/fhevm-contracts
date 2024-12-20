import { Signer } from "ethers";
import { ethers } from "hardhat";

import type { TestConfidentialVestingWalletCliff } from "../../types";

export async function deployConfidentialVestingWalletCliffFixture(
  account: Signer,
  beneficiaryAddress: string,
  token: string,
  startTimestamp: bigint,
  duration: bigint,
  cliffSeconds: bigint,
): Promise<TestConfidentialVestingWalletCliff> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialVestingWalletCliff");
  const contract = await contractFactory
    .connect(account)
    .deploy(beneficiaryAddress, token, startTimestamp, duration, cliffSeconds);
  await contract.waitForDeployment();
  return contract;
}
