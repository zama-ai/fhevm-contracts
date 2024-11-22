// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { EncryptedERC20Wrapped } from "../../../token/ERC20/EncryptedERC20Wrapped.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { MockZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";

contract TestEncryptedERC20Wrapped is MockZamaFHEVMConfig, MockZamaGatewayConfig, EncryptedERC20Wrapped {
    constructor(address erc20_) EncryptedERC20Wrapped(erc20_) {}
}
