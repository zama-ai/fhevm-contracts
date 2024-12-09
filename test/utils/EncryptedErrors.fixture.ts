import { Signer } from "ethers";
import { ethers } from "hardhat";

import type { TestEncryptedErrors } from "../../types";

export async function deployEncryptedErrors(account: Signer, numberErrors: number): Promise<TestEncryptedErrors> {
  const contractFactory = await ethers.getContractFactory("TestEncryptedErrors");
  const contract = await contractFactory.connect(account).deploy(numberErrors);
  await contract.waitForDeployment();
  return contract;
}
