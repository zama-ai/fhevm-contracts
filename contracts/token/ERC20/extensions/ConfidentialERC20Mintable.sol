// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

import { ConfidentialERC20 } from "../ConfidentialERC20.sol";

/**
 * @title       ConfidentialERC20Mintable
 * @notice      This contract inherits ConfidentialERC20.
 * @dev         It allows an owner to mint tokens. Mint amounts are public.
 */
abstract contract ConfidentialERC20Mintable is Ownable2Step, ConfidentialERC20 {
    /**
     * @notice Emitted when `amount` tokens are minted to one account (`to`).
     */
    event Mint(address indexed to, uint64 amount);

    /**
     * @param name_ Name of the token.
     * @param symbol_ Symbol.
     * @param owner_ Owner address.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address owner_
    ) Ownable(owner_) ConfidentialERC20(name_, symbol_) {}

    /**
     * @notice Mint tokens.
     * @param amount Amount of tokens to mint.
     */
    function mint(uint64 amount) public virtual onlyOwner {
        _unsafeMint(msg.sender, amount);
        /// @dev Since _totalSupply is not encrypted and _totalSupply >= balances[msg.sender],
        /// the next line contains an overflow check for the encrypted operation above.
        _totalSupply = _totalSupply + amount;
        emit Mint(msg.sender, amount);
    }
}
