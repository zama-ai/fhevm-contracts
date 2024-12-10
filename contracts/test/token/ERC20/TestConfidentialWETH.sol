// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { ConfidentialWETH } from "../../../token/ERC20/ConfidentialWETH.sol";
import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { SepoliaZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";

contract TestConfidentialWETH is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, ConfidentialWETH {
    constructor(uint256 maxDecryptionDelay_) ConfidentialWETH(maxDecryptionDelay_) {}
}
