// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { Comp } from "../../governance/Comp.sol";
import { DefaultFHEVMConfig } from "../DefaultFHEVMConfig.sol";

contract TestComp is DefaultFHEVMConfig, Comp {
    constructor(address owner_) Comp(owner_) {
        //
    }
}
