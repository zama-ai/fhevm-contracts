// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { EncryptedWETH } from "../../../token/ERC20/EncryptedWETH.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { MockZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";

/* solhint-disable no-empty-blocks*/
contract TestEncryptedWETH is MockZamaFHEVMConfig, MockZamaGatewayConfig, EncryptedWETH {}
