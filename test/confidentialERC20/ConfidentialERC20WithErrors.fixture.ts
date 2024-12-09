import { Signer } from "ethers";
import { FhevmInstance } from "fhevmjs/node";
import { ethers } from "hardhat";

import type { TestConfidentialERC20WithErrorsMintable } from "../../types";
import { reencryptEuint8 } from "../reencrypt";

export async function deployConfidentialERC20WithErrorsFixture(
  signer: Signer,
  name: string,
  symbol: string,
  ownerAddress: string,
): Promise<TestConfidentialERC20WithErrorsMintable> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialERC20WithErrorsMintable");
  const contract = await contractFactory.connect(signer).deploy(name, symbol, ownerAddress);
  await contract.waitForDeployment();
  return contract;
}

export async function checkErrorCode(
  account: Signer,
  instance: FhevmInstance,
  transferId: bigint,
  token: TestConfidentialERC20WithErrorsMintable,
  tokenAddress: string,
): Promise<string> {
  const errorCodeHandle = await token.getErrorCodeForTransferId(transferId);
  const errorCode = await reencryptEuint8(account, instance, errorCodeHandle, tokenAddress);
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
