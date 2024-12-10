import { Signer } from "ethers";
import { ethers } from "hardhat";

import type { ConfidentialERC20Wrapped, ERC20Mintable, TestConfidentialERC20Wrapped } from "../../types";

export async function deployERC20AndConfidentialERC20WrappedFixture(
  account: Signer,
  name: string,
  symbol: string,
  decimals: number,
): Promise<[ERC20Mintable, TestConfidentialERC20Wrapped]> {
  // @dev We use 5 minutes for the maximum decryption delay (from the Gateway).
  const maxDecryptionDelay = 60 * 5;
  const contractFactoryERC20Mintable = await ethers.getContractFactory("ERC20Mintable");
  const contractERC20 = await contractFactoryERC20Mintable
    .connect(account)
    .deploy(name, symbol, decimals, await account.getAddress());
  await contractERC20.waitForDeployment();

  const contractFactory = await ethers.getContractFactory("TestConfidentialERC20Wrapped");
  const contractConfidentialERC20Wrapped = await contractFactory
    .connect(account)
    .deploy(contractERC20.getAddress(), maxDecryptionDelay);
  await contractConfidentialERC20Wrapped.waitForDeployment();

  return [contractERC20, contractConfidentialERC20Wrapped];
}

export async function mintAndWrap(
  account: Signer,
  plainToken: ERC20Mintable,
  token: ConfidentialERC20Wrapped,
  tokenAddress: string,
  amount: bigint,
): Promise<void> {
  let tx = await plainToken.connect(account).mint(amount);
  await tx.wait();

  tx = await plainToken.connect(account).approve(tokenAddress, amount);
  await tx.wait();

  tx = await token.connect(account).wrap(amount);
  await tx.wait();
}
