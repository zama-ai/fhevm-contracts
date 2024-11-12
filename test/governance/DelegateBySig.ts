import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Address } from "hardhat-deploy/types";

import type { Comp } from "../../types";

export const delegateBySig = async (
  _signer: HardhatEthersSigner,
  _delegatee: Address,
  _comp: Comp,
  _nonce: number,
  _expiry: number,
): Promise<[BigInt, string, string]> => {
  const compAddress_ = await _comp.getAddress();
  const delegatee_ = _delegatee;
  const nonce_ = _nonce;
  const expiry_ = _expiry;

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  const domain = {
    name: await _comp.name(),
    chainId: chainId,
    verifyingContract: compAddress_,
  };
  // Delegation(address delegatee,uint256 nonce,uint256 expiry)
  const types = {
    Delegation: [
      {
        name: "delegatee",
        type: "address",
      },
      {
        name: "nonce",
        type: "uint256",
      },
      {
        name: "expiry",
        type: "uint256",
      },
    ],
  };

  const message = {
    delegatee: delegatee_,
    nonce: nonce_,
    expiry: expiry_,
  };

  const signature = await _signer.signTypedData(domain, types, message);
  const sigRSV = ethers.Signature.from(signature);
  const v = 27 + sigRSV.yParity;
  const r = sigRSV.r;
  const s = sigRSV.s;
  return [BigInt(v), r, s];
};
