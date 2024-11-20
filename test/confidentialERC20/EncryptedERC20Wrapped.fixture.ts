import { ethers } from "hardhat";

import type { ERC20Mintable, EncryptedERC20Wrapped, TestEncryptedERC20Wrapped } from "../../types";
import { Signers } from "../signers";

export async function deployERC20AndEncryptedERC20WrappedFixture(
  signers: Signers,
  name: string,
  symbol: string,
  decimals: number,
): Promise<[ERC20Mintable, TestEncryptedERC20Wrapped]> {
  const contractFactoryERC20Mintable = await ethers.getContractFactory("ERC20Mintable");
  const contractERC20 = await contractFactoryERC20Mintable
    .connect(signers.alice)
    .deploy(name, symbol, decimals, signers.alice.address);
  await contractERC20.waitForDeployment();

  const contractFactoryEncryptedERC20Wrapped = await ethers.getContractFactory("TestEncryptedERC20Wrapped");
  const contractEncryptedERC20Wrapped = await contractFactoryEncryptedERC20Wrapped
    .connect(signers.alice)
    .deploy(contractERC20.getAddress());
  await contractEncryptedERC20Wrapped.waitForDeployment();

  return [contractERC20, contractEncryptedERC20Wrapped];
}

export async function mintAndWrap(
  signers: Signers,
  user: string,
  plainToken: ERC20Mintable,
  token: EncryptedERC20Wrapped,
  tokenAddress: string,
  amount: bigint,
): Promise<void> {
  let tx = await plainToken.connect(signers[user as keyof Signers]).mint(amount);
  await tx.wait();

  tx = await plainToken.connect(signers[user as keyof Signers]).approve(tokenAddress, amount);
  await tx.wait();

  tx = await token.connect(signers[user as keyof Signers]).wrap(amount);
  await tx.wait();
}
