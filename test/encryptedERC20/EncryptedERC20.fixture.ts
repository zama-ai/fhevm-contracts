import { ethers } from "hardhat";

import type { EncryptedERC20Mintable } from "../../types";
import { getSigners } from "../signers";

export async function deployEncryptedERC20Fixture(): Promise<EncryptedERC20Mintable> {
  const signers = await getSigners();

  const contractFactory = await ethers.getContractFactory("EncryptedERC20Mintable");
  const contract = await contractFactory.connect(signers.alice).deploy("Naraggara", "NARA", signers.alice.address); // City of Zama's battle
  await contract.waitForDeployment();

  return contract;
}
