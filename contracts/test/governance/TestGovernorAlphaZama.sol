// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { GovernorAlphaZama } from "../../governance/GovernorAlphaZama.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { MockZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";

contract TestGovernorAlphaZama is MockZamaFHEVMConfig, MockZamaGatewayConfig, GovernorAlphaZama {
    constructor(
        address owner_,
        address timelock_,
        address comp_,
        uint256 votingPeriod_
    ) GovernorAlphaZama(owner_, timelock_, comp_, votingPeriod_) {
        //
    }
}
