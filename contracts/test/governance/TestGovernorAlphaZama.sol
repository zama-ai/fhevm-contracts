// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { GovernorAlphaZama } from "../../governance/GovernorAlphaZama.sol";
import { DefaultFHEVMConfig } from "../DefaultFHEVMConfig.sol";
import { DefaultGatewayConfig } from "../DefaultGatewayConfig.sol";

contract TestGovernorAlphaZama is DefaultFHEVMConfig, DefaultGatewayConfig, GovernorAlphaZama {
    constructor(
        address owner_,
        address timelock_,
        address comp_,
        uint256 votingPeriod_
    ) GovernorAlphaZama(owner_, timelock_, comp_, votingPeriod_) {
        //
    }
}
