// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { EncryptedERC20Wrapped } from "../../../token/ERC20/EncryptedERC20Wrapped.sol";
import { DefaultFHEVMConfig } from "../../DefaultFHEVMConfig.sol";
import { DefaultGatewayConfig } from "../../DefaultGatewayConfig.sol";

contract TestEncryptedERC20Wrapped is DefaultFHEVMConfig, DefaultGatewayConfig, EncryptedERC20Wrapped {
    constructor(address erc20_) EncryptedERC20Wrapped(erc20_) {
        //
    }
}
