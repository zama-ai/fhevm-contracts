// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { EncryptedERC20 } from "../token/ERC20/EncryptedERC20.sol";

/**
 * @title       TestEncryptedERC20Mintable
 * @notice      This test contract inherits EncryptedERC20.
 * @dev         It allows any account to mint tokens. Mint amounts are public.
 */
contract TestEncryptedERC20Mintable is EncryptedERC20 {
    /**
     * @notice Emitted when `amount` tokens are minted to one account (`to`).
     */
    event Mint(address indexed to, uint64 amount);

    /**
     * @param name_ Name of the token.
     * @param symbol_ Symbol.
     */
    constructor(string memory name_, string memory symbol_) EncryptedERC20(name_, symbol_) {}

    /**
     * @notice Mint tokens.
     * @param amount Amount of tokens to mint.
     */
    function mint(uint64 amount) public {
        _balances[msg.sender] = TFHE.add(_balances[msg.sender], amount); // overflow impossible because of next line
        TFHE.allow(_balances[msg.sender], address(this));
        TFHE.allow(_balances[msg.sender], msg.sender);
        _totalSupply = _totalSupply + amount;
        emit Mint(msg.sender, amount);
    }
}
