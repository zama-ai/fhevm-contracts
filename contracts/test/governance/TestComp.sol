// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { Comp } from "../../governance/Comp.sol";
import { DefaultFHEVMConfig } from "../DefaultFHEVMConfig.sol";

contract TestComp is DefaultFHEVMConfig, Comp {
    constructor(
        address owner_,
        string memory name_,
        string memory symbol_,
        string memory version_
    ) Comp(owner_, name_, symbol_, version_) {
        //
    }
}
