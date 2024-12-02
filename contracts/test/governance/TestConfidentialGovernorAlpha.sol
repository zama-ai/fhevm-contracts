// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { ConfidentialGovernorAlpha } from "../../governance/ConfidentialGovernorAlpha.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { MockZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";

contract TestConfidentialGovernorAlpha is MockZamaFHEVMConfig, MockZamaGatewayConfig, ConfidentialGovernorAlpha {
    constructor(
        address owner_,
        address timelock_,
        address comp_,
        uint256 votingPeriod_
    ) ConfidentialGovernorAlpha(owner_, timelock_, comp_, votingPeriod_) {
        //
    }
}
