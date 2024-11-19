// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { EncryptedWETH } from "../../../token/ERC20/EncryptedWETH.sol";
import { DefaultFHEVMConfig } from "../../DefaultFHEVMConfig.sol";
import { DefaultGatewayConfig } from "../../DefaultGatewayConfig.sol";

/* solhint-disable no-empty-blocks*/
contract TestEncryptedWETH is DefaultFHEVMConfig, DefaultGatewayConfig, EncryptedWETH {}
