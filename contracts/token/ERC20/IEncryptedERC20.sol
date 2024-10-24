// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

/**
 * @title       IEncryptedERC20
 * @notice      Interface that defines ERC20-like tokens with encrypted balances.
 */
interface IEncryptedERC20 {
    /**
     * @notice Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}.
     */
    event Approval(address indexed owner, address indexed spender);

    /**
     * @notice Emitted when tokens are moved from one account (`from`) to
     * another (`to`).
     */
    event Transfer(address indexed from, address indexed to);

    /**
     * @notice Sets the `encryptedAmount` as the allowance of `spender` over the caller's tokens.
     */
    function approve(address spender, einput encryptedAmount, bytes calldata inputProof) external returns (bool);

    /**
     * @notice Sets the `amount` as the allowance of `spender` over the caller's tokens.
     */
    function approve(address spender, euint64 amount) external returns (bool);

    /**
     * @notice Transfers an encrypted amount from the message sender address to the `to` address.
     */
    function transfer(address to, einput encryptedAmount, bytes calldata inputProof) external returns (bool);

    /**
     * @notice Transfers an amount from the message sender address to the `to` address.
     */
    function transfer(address to, euint64 amount) external returns (bool);

    /**
     * @notice Transfers `amount` tokens using the caller's allowance.
     */
    function transferFrom(address from, address to, euint64 amount) external returns (bool);

    /**
     * @notice Transfers `encryptedAmount` tokens using the caller's allowance.
     */
    function transferFrom(
        address from,
        address to,
        einput encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool);

    /**
     * @notice Returns the remaining number of tokens that `spender` is allowed to spend
               on behalf of the caller.
     */
    function allowance(address owner, address spender) external view returns (euint64);

    /**
     * @notice Returns the balance handle of the caller.
     */
    function balanceOf(address wallet) external view returns (euint64);

    /**
     * @notice Returns the number of decimals.
     */
    function decimals() external view returns (uint8);

    /**
     * @notice Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @notice Returns the symbol of the token, usually a shorter version of the name.
     */
    function symbol() external view returns (string memory);

    /**
     * @notice Returns the total supply of the token.
     */
    function totalSupply() external view returns (uint64);
}
