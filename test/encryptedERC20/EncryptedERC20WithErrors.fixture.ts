import { ethers } from "hardhat";

import type { TestEncryptedERC20WithErrorsMintable } from "../../types";
import { reencryptEuint8 } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployEncryptedERC20WithErrorsFixture(
  signers: Signers,
  name: string,
  symbol: string,
  owner: string,
): Promise<TestEncryptedERC20WithErrorsMintable> {
  const contractFactory = await ethers.getContractFactory("TestEncryptedERC20WithErrorsMintable");
  const contract = await contractFactory
    .connect(signers[owner as keyof Signers])
    .deploy(name, symbol, signers[owner as keyof Signers].address);
  await contract.waitForDeployment();
  return contract;
}

export async function checkErrorCode(
  signers: Signers,
  instances: FhevmInstances,
  account: string,
  transferId: bigint,
  token: TestEncryptedERC20WithErrorsMintable,
  tokenAddress: string,
): Promise<string> {
  const errorCodeHandle = await token.getErrorCodeForTransferId(transferId);
  const errorCode = await reencryptEuint8(signers, instances, account, errorCodeHandle, tokenAddress);
  switch (errorCode) {
    case 0n: {
      return "NO_ERROR";
    }
    case 1n: {
      return "UNSUFFICIENT_BALANCE";
    }
    case 2n: {
      return "UNSUFFICIENT_APPROVAL";
    }
    default: {
      throw "Error code is invalid";
    }
  }
}
