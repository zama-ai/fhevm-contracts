// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title       IConfidentialERC20Wrapped/
 * @notice      Interface that defines events, errors, and structs for
 *              contrats that wrap native asset or ERC20 tokens.
 */
interface IConfidentialERC20Wrapped {
    /// @notice Returned if the amount is greater than 2**64.
    error AmountTooHigh();

    /// @notice Returned if user cannot transfer or mint.
    error CannotTransferOrUnwrap();

    /// @notice Emitted when token is unwrapped.
    event Unwrap(address indexed to, uint64 amount);

    /// @notice Emitted if unwrap fails.
    event UnwrapFail(address account, uint64 amount);

    /// @notice Emitted when token is wrapped.
    event Wrap(address indexed to, uint64 amount);

    /**
     * @notice          Keeps track of unwrap information.
     * @param account   Account that initiates the unwrap request.
     * @param amount    Amount to be unwrapped.
     */
    struct UnwrapRequest {
        address account;
        uint64 amount;
    }
}
