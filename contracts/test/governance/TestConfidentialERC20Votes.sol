// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { ConfidentialERC20Votes } from "../../governance/ConfidentialERC20Votes.sol";
import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";

contract TestConfidentialERC20Votes is SepoliaZamaFHEVMConfig, ConfidentialERC20Votes {
    constructor(
        address owner_,
        string memory name_,
        string memory symbol_,
        string memory version_,
        uint64 totalSupply_
    ) ConfidentialERC20Votes(owner_, name_, symbol_, version_, totalSupply_) {
        //
    }
}
