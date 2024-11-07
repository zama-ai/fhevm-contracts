// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { EncryptedERC20WithErrorsMintable } from "../../../token/ERC20/extensions/EncryptedERC20WithErrorsMintable.sol";
import { DefaultFHEVMConfig } from "../../DefaultFHEVMConfig.sol";

contract TestEncryptedERC20WithErrorsMintable is DefaultFHEVMConfig, EncryptedERC20WithErrorsMintable {
    constructor(
        string memory name_,
        string memory symbol_,
        address owner_
    ) EncryptedERC20WithErrorsMintable(name_, symbol_, owner_) {
        //
    }
}
