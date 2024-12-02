import { ethers } from "hardhat";

import type { TestConfidentialWETH } from "../../types";
import { Signers } from "../signers";

export async function deployConfidentialWETHFixture(signers: Signers): Promise<TestConfidentialWETH> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialWETH");
  const confidentialWETH = await contractFactory.connect(signers.alice).deploy();
  await confidentialWETH.waitForDeployment();

  return confidentialWETH;
}
