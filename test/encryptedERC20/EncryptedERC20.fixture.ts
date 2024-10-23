import { ethers } from "hardhat";

import type { IEncryptedERC20, TestEncryptedERC20Mintable } from "../../types";
import { reencryptHandle } from "../reencrypt";
import { Signers, getSigners } from "../signers";
import { FhevmInstances } from "../types";

export async function deployEncryptedERC20Fixture(name: string, symbol: string): Promise<TestEncryptedERC20Mintable> {
  const signers = await getSigners();
  const contractFactory = await ethers.getContractFactory("TestEncryptedERC20Mintable");
  const contract = await contractFactory.connect(signers.alice).deploy(name, symbol);
  await contract.waitForDeployment();
  return contract;
}

export async function reencryptAllowance(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  spender: string,
  token: IEncryptedERC20,
  tokenAddress: string,
): Promise<bigint> {
  const allowanceHandle = await token.allowance(signers[user as keyof Signers], signers[spender as keyof Signers]);
  const allowance = await reencryptHandle(signers, instances, user, allowanceHandle, tokenAddress);
  return allowance;
}

export async function reencryptBalance(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  token: IEncryptedERC20,
  tokenAddress: string,
): Promise<bigint> {
  const balanceHandle = await token.balanceOf(signers[user as keyof Signers]);
  const balance = await reencryptHandle(signers, instances, user, balanceHandle, tokenAddress);
  return balance;
}
