// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.20;

import "../EncryptedERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract EncryptedERC20Mintable is Ownable2Step, EncryptedERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        address owner
    ) Ownable(owner) EncryptedERC20(name_, symbol_) {}

    // Increase owner's balance by the given `mintedAmount`.
    function mint(uint64 mintedAmount) public virtual onlyOwner {
        _mint(mintedAmount);
    }
}
