import { Signer } from "ethers";
import { FhevmInstance } from "fhevmjs/node";
import { ethers } from "hardhat";

import type { IConfidentialERC20, TestConfidentialERC20Mintable } from "../../types";
import { reencryptEuint64 } from "../reencrypt";

export async function deployConfidentialERC20Fixture(
  account: Signer,
  name: string,
  symbol: string,
  ownerAddress: string,
): Promise<TestConfidentialERC20Mintable> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialERC20Mintable");
  const contract = await contractFactory.connect(account).deploy(name, symbol, ownerAddress);
  await contract.waitForDeployment();
  return contract;
}

export async function reencryptAllowance(
  account: Signer,
  spender: Signer,
  instance: FhevmInstance,
  token: IConfidentialERC20,
  tokenAddress: string,
): Promise<bigint> {
  const allowanceHandle = await token.allowance(account, spender);
  const allowance = await reencryptEuint64(account, instance, allowanceHandle, tokenAddress);
  return allowance;
}

export async function reencryptBalance(
  account: Signer,
  instance: FhevmInstance,
  token: IConfidentialERC20,
  tokenAddress: string,
): Promise<bigint> {
  const balanceHandle = await token.balanceOf(account);
  const balance = await reencryptEuint64(account, instance, balanceHandle, tokenAddress);
  return balance;
}
