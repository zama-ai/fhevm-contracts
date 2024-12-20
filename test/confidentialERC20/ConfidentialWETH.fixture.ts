import { Signer } from "ethers";
import { ethers } from "hardhat";

import type { TestConfidentialWETH } from "../../types";

export async function deployConfidentialWETHFixture(account: Signer): Promise<TestConfidentialWETH> {
  // @dev We use 5 minutes for the maximum decryption delay (from the Gateway).
  const maxDecryptionDelay = 60 * 5;
  const contractFactory = await ethers.getContractFactory("TestConfidentialWETH");
  const confidentialWETH = await contractFactory.connect(account).deploy(maxDecryptionDelay);
  await confidentialWETH.waitForDeployment();

  return confidentialWETH;
}
