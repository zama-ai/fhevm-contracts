import { ethers } from "hardhat";

import type { IConfidentialERC20, TestConfidentialERC20Mintable } from "../../types";
import { reencryptEuint64 } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployConfidentialERC20Fixture(
  signers: Signers,
  name: string,
  symbol: string,
  owner: string,
): Promise<TestConfidentialERC20Mintable> {
  const contractFactory = await ethers.getContractFactory("TestConfidentialERC20Mintable");
  const contract = await contractFactory
    .connect(signers[owner as keyof Signers])
    .deploy(name, symbol, signers[owner as keyof Signers].address);
  await contract.waitForDeployment();
  return contract;
}

export async function reencryptAllowance(
  signers: Signers,
  instances: FhevmInstances,
  account: string,
  spender: string,
  token: IConfidentialERC20,
  tokenAddress: string,
): Promise<bigint> {
  const allowanceHandle = await token.allowance(signers[account as keyof Signers], signers[spender as keyof Signers]);
  const allowance = await reencryptEuint64(signers, instances, account, allowanceHandle, tokenAddress);
  return allowance;
}

export async function reencryptBalance(
  signers: Signers,
  instances: FhevmInstances,
  account: string,
  token: IConfidentialERC20,
  tokenAddress: string,
): Promise<bigint> {
  const balanceHandle = await token.balanceOf(signers[account as keyof Signers]);
  const balance = await reencryptEuint64(signers, instances, account, balanceHandle, tokenAddress);
  return balance;
}
