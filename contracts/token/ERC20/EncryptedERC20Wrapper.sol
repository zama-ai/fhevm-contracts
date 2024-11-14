// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { EncryptedERC20 } from "./EncryptedERC20.sol";

import "fhevm/lib/TFHE.sol";

/**
 * @title             EncryptedERC20Wrapped
 * @notice            This contract allows users to wrap/unwrap trustlessly
 *                    ERC20 tokens to EncryptedERC20 tokens.
 * @dev               This implementation does not support tokens with rebase functions or
 *                    tokens with a fee on transfer. All ERC20 tokens must have decimals
 *                    inferior or equal to 18 decimals.
 */
abstract contract EncryptedERC20Wrapped is EncryptedERC20 {
    /// @notice Returned if the amount is greater than 2**64.
    error AmountTooHigh();

    /// @notice Emitted when token is unwrapped.
    event Unwrap(address indexed to, uint64 amount);

    /// @notice Emitted when token is wrapped.
    event Wrap(address indexed to, uint64 amount);

    /// @notice ERC20 token that is wrapped.
    IERC20Metadata public immutable ERC20_TOKEN;

    /**
     * @notice         Deposit/withdraw ERC20 tokens using encrypted ERC20 tokens.
     * @param erc20_   Address of the ERC20 token to wrap/unwrap.
     * @dev            The name/symbol are autogenerated.
     *                 For instance,
     *                 "Wrapped Ether" --> "Encrypted Wrapped Ether"
     *                 "WETH" --> "eWETH".
     */
    constructor(
        address erc20_
    )
        EncryptedERC20(
            string(abi.encodePacked("Encrypted ", IERC20Metadata(erc20_).name())),
            string(abi.encodePacked("e", IERC20Metadata(erc20_).symbol()))
        )
    {
        ERC20_TOKEN = IERC20Metadata(erc20_);
    }

    /**
     * @notice         Unwrap EncryptedERC20 tokens to standard ERC20 tokens.
     * @param amount   Amount to unwrap.
     */
    function unwrap(uint64 amount) public virtual {
        _balances[msg.sender] = TFHE.sub(_balances[msg.sender], amount);
        TFHE.allowThis(_balances[msg.sender]);
        TFHE.allow(_balances[msg.sender], msg.sender);

        _totalSupply -= amount;

        /// @dev It does a supply adjustment.
        uint256 amountUint256 = amount * (10 ** (ERC20_TOKEN.decimals() - decimals()));

        ERC20_TOKEN.transfer(msg.sender, amountUint256);

        emit Unwrap(msg.sender, amount);
    }

    /**
     * @notice         Wrap ERC20 tokens to an encrypted format.
     * @param amount   Amount to wrap.
     */
    function wrap(uint256 amount) public virtual {
        ERC20_TOKEN.transferFrom(msg.sender, address(this), amount);

        if (amount > type(uint64).max) {
            revert AmountTooHigh();
        }

        uint64 amountUint64 = uint64(amount / (10 ** (ERC20_TOKEN.decimals() - decimals())));
        _balances[msg.sender] = TFHE.add(_balances[msg.sender], amountUint64);

        TFHE.allowThis(_balances[msg.sender]);
        TFHE.allow(_balances[msg.sender], msg.sender);

        _totalSupply += amountUint64;

        emit Wrap(msg.sender, amountUint64);
    }
}
