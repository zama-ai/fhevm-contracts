// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { EncryptedERC20 } from "../EncryptedERC20.sol";
import { EncryptedErrors } from "../../../utils/EncryptedErrors.sol";

/**
 * @title       EncryptedERC20WithErrors
 * @notice      This contract implements an encrypted ERC20-like token with confidential balances using
 *              Zama's FHE (Fully Homomorphic Encryption) library.
 * @dev         It supports standard ERC20 functions such as transferring tokens, minting,
 *              and setting allowances, but uses encrypted data types.
 *              The total supply is not encrypted.
 *              It also supports error handling for encrypted errors.
 */

abstract contract EncryptedERC20WithErrors is EncryptedERC20, EncryptedErrors {
    /**
     * @notice Emitted when tokens are moved from one account (`from`) to
     * another (`to`).
     */
    event TransferWithErrorHandling(address indexed from, address indexed to, uint256 transferId);

    /**
     * @notice Error codes allow tracking (in the storage) whether a transfer worked.
     * @dev    NO_ERROR: the transfer worked as expected
     *         UNSUFFICIENT_BALANCE: the transfer failed because the
     *         from balances were strictly inferior to the amount to transfer.
     *         UNSUFFICIENT_APPROVAL: the transfer failed because the sender allowance
     *         was strictly lower than the amount to transfer.
     */
    enum ErrorCodes {
        NO_ERROR,
        UNSUFFICIENT_BALANCE,
        UNSUFFICIENT_APPROVAL
    }

    /// @notice Keeps track of the current transferId.
    uint256 private _transferIdCounter;

    /// @notice A mapping from transferId to the error code.
    mapping(uint256 transferId => euint8 errorCode) internal _errorCodeForTransferId;

    /**
     * @param name_ Name of the token.
     * @param symbol_ Symbol.
     */
    constructor(
        string memory name_,
        string memory symbol_
    ) EncryptedERC20(name_, symbol_) EncryptedErrors(uint8(type(ErrorCodes).max)) {}

    /**
     * @notice See {IEncryptedERC20-transfer}.
     */
    function transfer(address to, euint64 amount) public virtual override returns (bool) {
        _isSenderAllowedForAmount(amount);

        /// Check whether the owner has enough tokens.
        ebool canTransfer = TFHE.le(amount, _balances[msg.sender]);

        euint8 errorCode = TFHE.select(
            canTransfer,
            _errorCodes[uint8(ErrorCodes.NO_ERROR)],
            _errorCodes[uint8(ErrorCodes.UNSUFFICIENT_BALANCE)]
        );

        _transferWithErrorCode(msg.sender, to, amount, canTransfer, errorCode);
        return true;
    }

    /**
     * @notice See {IEncryptedERC20-transferFrom}.
     */
    function transferFrom(address from, address to, euint64 amount) public virtual override returns (bool) {
        _isSenderAllowedForAmount(amount);
        address spender = msg.sender;
        (ebool isTransferable, euint8 errorCode) = _updateAllowanceWithErrorCode(from, spender, amount);
        _transferWithErrorCode(from, to, amount, isTransferable, errorCode);
        return true;
    }

    /**
     * @notice Returns the error code corresponding to `transferId`.
     */
    function getErrorCodeForTransferId(uint256 transferId) external view virtual returns (euint8 errorCode) {
        return _errorCodeForTransferId[transferId];
    }

    function _transferWithErrorCode(
        address from,
        address to,
        euint64 amount,
        ebool isTransferable,
        euint8 errorCode
    ) internal virtual {
        _transferNoEvent(from, to, amount, isTransferable);
        emit TransferWithErrorHandling(from, to, _transferIdCounter);

        /// Set the error code in the storage and increment.
        _errorCodeForTransferId[_transferIdCounter++] = errorCode;

        TFHE.allowThis(errorCode);
        TFHE.allow(errorCode, from);
        TFHE.allow(errorCode, to);
    }

    function _updateAllowanceWithErrorCode(
        address owner,
        address spender,
        euint64 amount
    ) internal virtual returns (ebool isTransferable, euint8 errorCode) {
        euint64 currentAllowance = _allowance(owner, spender);

        /// Make sure sure the allowance suffices.
        ebool allowedTransfer = TFHE.le(amount, currentAllowance);

        errorCode = TFHE.select(
            allowedTransfer,
            _errorCodes[uint8(ErrorCodes.UNSUFFICIENT_APPROVAL)],
            _errorCodes[uint8(ErrorCodes.NO_ERROR)]
        );

        /// Make sure the owner has enough tokens.
        ebool canTransfer = TFHE.le(amount, _balances[owner]);

        errorCode = TFHE.select(
            TFHE.eq(errorCode, 0),
            TFHE.select(
                canTransfer,
                _errorCodes[uint8(ErrorCodes.UNSUFFICIENT_BALANCE)],
                _errorCodes[uint8(ErrorCodes.NO_ERROR)]
            ),
            errorCode
        );

        isTransferable = TFHE.and(canTransfer, allowedTransfer);
        _approve(owner, spender, TFHE.select(isTransferable, TFHE.sub(currentAllowance, amount), currentAllowance));
    }
}
