// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { EncryptedERC20Mintable } from "../../../token/ERC20/extensions/EncryptedERC20Mintable.sol";
import { DefaultFHEVMConfig } from "../../DefaultFHEVMConfig.sol";

contract TestEncryptedERC20Mintable is DefaultFHEVMConfig, EncryptedERC20Mintable {
    constructor(
        string memory name_,
        string memory symbol_,
        address owner_
    ) EncryptedERC20Mintable(name_, symbol_, owner_) {
        //
    }
}
