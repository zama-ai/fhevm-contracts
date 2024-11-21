// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { Comp } from "../../governance/Comp.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";

contract TestComp is MockZamaFHEVMConfig, Comp {
    constructor(
        address owner_,
        string memory name_,
        string memory symbol_,
        string memory version_,
        uint64 totalSupply_
    ) Comp(owner_, name_, symbol_, version_, totalSupply_) {
        //
    }
}
