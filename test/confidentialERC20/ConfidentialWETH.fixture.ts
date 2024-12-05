import { ethers } from "hardhat";

import type { TestConfidentialWETH } from "../../types";
import { Signers } from "../signers";

export async function deployConfidentialWETHFixture(signers: Signers): Promise<TestConfidentialWETH> {
  // @dev We use 5 minutes for the maximum decryption delay (from the Gateway).
  const maxDecryptionDelay = 60 * 5;
  const contractFactory = await ethers.getContractFactory("TestConfidentialWETH");
  const confidentialWETH = await contractFactory.connect(signers.alice).deploy(maxDecryptionDelay);
  await confidentialWETH.waitForDeployment();

  return confidentialWETH;
}
