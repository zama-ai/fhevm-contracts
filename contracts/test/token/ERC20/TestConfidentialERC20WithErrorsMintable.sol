// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {
    ConfidentialERC20WithErrorsMintable
} from "../../../token/ERC20/extensions/ConfidentialERC20WithErrorsMintable.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";

contract TestConfidentialERC20WithErrorsMintable is MockZamaFHEVMConfig, ConfidentialERC20WithErrorsMintable {
    constructor(
        string memory name_,
        string memory symbol_,
        address owner_
    ) ConfidentialERC20WithErrorsMintable(name_, symbol_, owner_) {
        //
    }
}
