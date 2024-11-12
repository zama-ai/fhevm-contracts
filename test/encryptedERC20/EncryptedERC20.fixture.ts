import { ethers } from "hardhat";

import type { IEncryptedERC20, TestEncryptedERC20Mintable } from "../../types";
import { reencryptEuint64 } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployEncryptedERC20Fixture(
  signers: Signers,
  name: string,
  symbol: string,
  owner: string,
): Promise<TestEncryptedERC20Mintable> {
  const contractFactory = await ethers.getContractFactory("TestEncryptedERC20Mintable");
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
  token: IEncryptedERC20,
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
  token: IEncryptedERC20,
  tokenAddress: string,
): Promise<bigint> {
  const balanceHandle = await token.balanceOf(signers[account as keyof Signers]);
  const balance = await reencryptEuint64(signers, instances, account, balanceHandle, tokenAddress);
  return balance;
}
