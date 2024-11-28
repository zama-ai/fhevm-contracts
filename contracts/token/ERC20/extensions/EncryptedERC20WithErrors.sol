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
        euint8 errorCode = _errorDefineIfNot(canTransfer, uint8(ErrorCodes.UNSUFFICIENT_BALANCE));
        _errorSave(errorCode);
        TFHE.allow(errorCode, msg.sender);
        TFHE.allow(errorCode, to);
        _transfer(msg.sender, to, amount, canTransfer);
        return true;
    }

    function getErrorCodeForTransferId(uint256 transferId) public view virtual returns (euint8) {
        return _errorGetCodeEmitted(transferId);
    }

    function _transfer(address from, address to, euint64 amount, ebool isTransferable) internal override {
        _transferNoEvent(from, to, amount, isTransferable);
        emit Transfer(from, to, _errorGetCounter() - 1);
    }

    /**
     * @notice See {IEncryptedERC20-transferFrom}.
     */
    function transferFrom(address from, address to, euint64 amount) public virtual override returns (bool) {
        _isSenderAllowedForAmount(amount);
        address spender = msg.sender;
        ebool isTransferable = _updateAllowance(from, spender, amount);
        _transfer(from, to, amount, isTransferable);
        return true;
    }

    function _updateAllowance(
        address owner,
        address spender,
        euint64 amount
    ) internal virtual override returns (ebool isTransferable) {
        euint64 currentAllowance = _allowance(owner, spender);
        /// Make sure sure the allowance suffices.
        ebool allowedTransfer = TFHE.le(amount, currentAllowance);
        euint8 errorCode = _errorDefineIfNot(allowedTransfer, uint8(ErrorCodes.UNSUFFICIENT_APPROVAL));
        /// Make sure the owner has enough tokens.
        ebool canTransfer = TFHE.le(amount, _balances[owner]);
        ebool isNotTransferableButIsApproved = TFHE.and(TFHE.not(canTransfer), allowedTransfer);
        errorCode = _errorChangeIf(
            isNotTransferableButIsApproved, // should indeed check that spender is approved to not leak information
            // on balance of `from` to unauthorized spender via calling reencryptTransferError afterwards
            uint8(ErrorCodes.UNSUFFICIENT_BALANCE),
            errorCode
        );
        _errorSave(errorCode);
        TFHE.allow(errorCode, owner);
        TFHE.allow(errorCode, spender);
        isTransferable = TFHE.and(canTransfer, allowedTransfer);
        _approve(owner, spender, TFHE.select(isTransferable, TFHE.sub(currentAllowance, amount), currentAllowance));
    }
}
