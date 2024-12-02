// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { ConfidentialERC20Wrapped } from "../../../token/ERC20/ConfidentialERC20Wrapped.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { MockZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";

contract TestConfidentialERC20Wrapped is MockZamaFHEVMConfig, MockZamaGatewayConfig, ConfidentialERC20Wrapped {
    constructor(address erc20_) ConfidentialERC20Wrapped(erc20_) {}
}
