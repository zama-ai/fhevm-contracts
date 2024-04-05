import { ContractMethodArgs, Typed } from "ethers";
import { ethers } from "hardhat";

import { TypedContractMethod } from "../types/common";
import { getSigners } from "./signers";

export const waitForBlock = (blockNumber: bigint | number) => {
  if (process.env.HARDHAT_NETWORK === "hardhat") {
    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        try {
          const currentBlock = await ethers.provider.getBlockNumber();
          if (BigInt(currentBlock) >= blockNumber) {
            clearInterval(intervalId);
            resolve(currentBlock);
          }
        } catch (error) {
          clearInterval(intervalId);
          reject(error);
        }
      }, 50); // Check every 50 milliseconds
    });
  } else {
    return new Promise((resolve, reject) => {
      const waitBlock = async (currentBlock: number) => {
        if (blockNumber <= BigInt(currentBlock)) {
          await ethers.provider.off("block", waitBlock);
          resolve(blockNumber);
        }
      };
      ethers.provider.on("block", waitBlock).catch((err) => {
        reject(err);
      });
    });
  }
};

export const waitNBlocks = async (Nblocks: number) => {
  const currentBlock = await ethers.provider.getBlockNumber();
  if (process.env.HARDHAT_NETWORK === "hardhat") {
    await produceDummyTransactions(Nblocks);
  }
  await waitForBlock(currentBlock + Nblocks);
};

export const waitForBalance = async (address: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const checkBalance = async () => {
      const balance = await ethers.provider.getBalance(address);
      if (balance > 0) {
        await ethers.provider.off("block", checkBalance);
        resolve();
      }
    };
    ethers.provider.on("block", checkBalance).catch((err) => {
      reject(err);
    });
  });
};

export const createTransaction = async <A extends [...{ [I in keyof A]-?: A[I] | Typed }]>(
  method: TypedContractMethod<A>,
  ...params: A
) => {
  const gasLimit = await method.estimateGas(...params);
  const updatedParams: ContractMethodArgs<A> = [
    ...params,
    { gasLimit: Math.min(Math.round(+gasLimit.toString() * 1.2), 10000000) },
  ];
  return method(...updatedParams);
};

export const produceDummyTransactions = async (blockCount: number) => {
  const nullAddress = "0x0000000000000000000000000000000000000000";
  const signers = await getSigners();
  while (blockCount > 0) {
    blockCount--;
    // Sending 0 ETH to the null address
    const tx = await signers.dave.sendTransaction({
      to: nullAddress,
      value: ethers.parseEther("0"),
    });
  }
};

export const mineNBlocks = async (n: number) => {
  // this only works in mocked mode
  await ethers.provider.send("hardhat_mine", ["0x" + n.toString(16)]);
};
