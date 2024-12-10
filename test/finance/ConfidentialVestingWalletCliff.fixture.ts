import { Signer } from "ethers";
import { ethers } from "hardhat";

import type { TestConfidentialVestingWalletCliff } from "../../types";

export async function deployConfidentialVestingWalletFixture(
  account: Signer,
  beneficiaryAddress: string,
  token: string,
  startTimestamp: bigint,
  duration: bigint,
  cliff: bigint,
): Promise<TestConfidentialVestingWalletCliff> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialVestingWalletCliff");
  const contract = await contractFactory
    .connect(account)
    .deploy(beneficiaryAddress, token, startTimestamp, duration, cliff);
  await contract.waitForDeployment();
  return contract;
}
