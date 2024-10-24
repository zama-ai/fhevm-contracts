import { ethers } from "hardhat";

import type { EncryptedERC20Mintable, IEncryptedERC20 } from "../../types";
import { reencryptHandle } from "../reencrypt";
import { Signers } from "../signers";
import { FhevmInstances } from "../types";

export async function deployEncryptedERC20Fixture(
  signers: Signers,
  name: string,
  symbol: string,
  owner: string,
): Promise<EncryptedERC20Mintable> {
  const contractFactory = await ethers.getContractFactory("EncryptedERC20Mintable");
  const contract = await contractFactory
    .connect(signers[owner as keyof Signers])
    .deploy(name, symbol, signers[owner as keyof Signers].address);
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
