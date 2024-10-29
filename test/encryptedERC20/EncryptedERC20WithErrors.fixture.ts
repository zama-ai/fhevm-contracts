import { ethers } from "hardhat";

import type { EncryptedERC20WithErrorsMintable } from "../../types";
import { reencryptEuint8 } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployEncryptedERC20WithErrorsFixture(
  signers: Signers,
  name: string,
  symbol: string,
  owner: string,
): Promise<EncryptedERC20WithErrorsMintable> {
  const contractFactory = await ethers.getContractFactory("EncryptedERC20WithErrorsMintable");
  const contract = await contractFactory
    .connect(signers[owner as keyof Signers])
    .deploy(name, symbol, signers[owner as keyof Signers].address);
  await contract.waitForDeployment();
  return contract;
}

export async function checkErrorCode(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  transferId: bigint,
  token: EncryptedERC20WithErrorsMintable,
  tokenAddress: string,
): Promise<string> {
  const errorCodeHandle = await token.getErrorCodeForTransferId(transferId);
  const errorCode = await reencryptEuint8(signers, instances, user, errorCodeHandle, tokenAddress);
  switch (errorCode) {
    case BigInt(0): {
      return "NO_ERROR";
    }
    case BigInt(1): {
      return "UNSUFFICIENT_BALANCE";
    }
    case BigInt(2): {
      return "UNSUFFICIENT_APPROVAL";
    }
    default: {
      throw "Error code is invalid";
    }
  }
}
