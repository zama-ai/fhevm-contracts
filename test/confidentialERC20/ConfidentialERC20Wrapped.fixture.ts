import { ethers } from "hardhat";

import type { ConfidentialERC20Wrapped, ERC20Mintable, TestConfidentialERC20Wrapped } from "../../types";
import { Signers } from "../signers";

export async function deployERC20AndConfidentialERC20WrappedFixture(
  signers: Signers,
  name: string,
  symbol: string,
  decimals: number,
): Promise<[ERC20Mintable, TestConfidentialERC20Wrapped]> {
  const contractFactoryERC20Mintable = await ethers.getContractFactory("ERC20Mintable");
  const contractERC20 = await contractFactoryERC20Mintable
    .connect(signers.alice)
    .deploy(name, symbol, decimals, signers.alice.address);
  await contractERC20.waitForDeployment();

  const contractFactory = await ethers.getContractFactory("TestConfidentialERC20Wrapped");
  const contractConfidentialERC20Wrapped = await contractFactory
    .connect(signers.alice)
    .deploy(contractERC20.getAddress());
  await contractConfidentialERC20Wrapped.waitForDeployment();

  return [contractERC20, contractConfidentialERC20Wrapped];
}

export async function mintAndWrap(
  signers: Signers,
  user: string,
  plainToken: ERC20Mintable,
  token: ConfidentialERC20Wrapped,
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
