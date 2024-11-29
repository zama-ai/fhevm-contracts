import { ethers } from "hardhat";

import type { TestEncryptedErrors } from "../../types";
import { Signers } from "../signers";

export async function deployEncryptedErrors(signers: Signers, numberErrors: number): Promise<TestEncryptedErrors> {
  const contractFactory = await ethers.getContractFactory("TestEncryptedErrors");
  const contract = await contractFactory.connect(signers.alice).deploy(numberErrors);
  await contract.waitForDeployment();
  return contract;
}
