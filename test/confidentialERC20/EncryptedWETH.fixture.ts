import { ethers } from "hardhat";

import type { TestEncryptedWETH } from "../../types";
import { Signers } from "../signers";

export async function deployEncryptedWETHFixture(signers: Signers): Promise<TestEncryptedWETH> {
  const contractFactoryEncryptedWETH = await ethers.getContractFactory("TestEncryptedWETH");
  const encryptedWETH = await contractFactoryEncryptedWETH.connect(signers.alice).deploy();
  await encryptedWETH.waitForDeployment();

  return encryptedWETH;
}
