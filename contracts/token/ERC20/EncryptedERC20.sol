// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { IEncryptedERC20 } from "./IEncryptedERC20.sol";

/**
 * @title       EncryptedERC20
 * @notice      This contract implements an encrypted ERC20-like token with confidential balances using
 *              Zama's FHE (Fully Homomorphic Encryption) library.
 * @dev         It supports standard ERC20 functions such as transferring tokens, minting,
 *              and setting allowances, but uses encrypted data types.
 *              The total supply is not encrypted.
 */
abstract contract EncryptedERC20 is IEncryptedERC20 {
    /// @notice Total supply.
    uint64 internal _totalSupply;

    /// @notice Name.
    string internal _name;

    /// @notice Symbol.
    string internal _symbol;

    /// @notice A mapping from `account` address to an encrypted `balance`.
    mapping(address account => euint64 balance) internal _balances;

    /// @notice A mapping of the form mapping(account => mapping(spender => allowance)).
    mapping(address account => mapping(address spender => euint64 allowance)) internal _allowances;

    /**
     * @notice Error when the `sender` is not allowed to access a value.
     */
    error TFHESenderNotAllowed();

    /**
     * @param name_ Name of the token.
     * @param symbol_ Symbol.
     */
    constructor(string memory name_, string memory symbol_) {
        TFHE.setFHEVM(FHEVMConfig.defaultConfig());
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @notice See {IEncryptedERC20-approve}.
     */
    function approve(address spender, einput encryptedAmount, bytes calldata inputProof) public virtual returns (bool) {
        approve(spender, TFHE.asEuint64(encryptedAmount, inputProof));
        return true;
    }

    /**
     * @notice See {IEncryptedERC20-approve}.
     */
    function approve(address spender, euint64 amount) public virtual returns (bool) {
        _isSenderAllowedForAmount(amount);
        address owner = msg.sender;
        _approve(owner, spender, amount);
        emit Approval(owner, spender);
        return true;
    }

    /**
     * @notice See {IEncryptedERC20-transfer}.
     */
    function transfer(address to, einput encryptedAmount, bytes calldata inputProof) public virtual returns (bool) {
        transfer(to, TFHE.asEuint64(encryptedAmount, inputProof));
        return true;
    }

    /**
     * @notice See {IEncryptedERC20-transfer}.
     */
    function transfer(address to, euint64 amount) public virtual returns (bool) {
        _isSenderAllowedForAmount(amount);

        // Make sure the owner has enough tokens
        ebool canTransfer = TFHE.le(amount, _balances[msg.sender]);
        _transfer(msg.sender, to, amount, canTransfer);
        return true;
    }

    /**
     * @notice See {IEncryptedERC20-transferFrom}.
     */
    function transferFrom(
        address from,
        address to,
        einput encryptedAmount,
        bytes calldata inputProof
    ) public virtual returns (bool) {
        transferFrom(from, to, TFHE.asEuint64(encryptedAmount, inputProof));
        return true;
    }

    /**
     * @notice See {IEncryptedERC20-transferFrom}.
     */
    function transferFrom(address from, address to, euint64 amount) public virtual returns (bool) {
        _isSenderAllowedForAmount(amount);
        address spender = msg.sender;
        ebool isTransferable = _updateAllowance(from, spender, amount);
        _transfer(from, to, amount, isTransferable);
        return true;
    }

    /**
     * @notice See {IEncryptedERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual returns (euint64) {
        return _allowance(owner, spender);
    }

    /**
     * @notice See {IEncryptedERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual returns (euint64) {
        return _balances[account];
    }

    /**
     * @notice See {IEncryptedERC20-decimals}.
     */
    function decimals() public view virtual returns (uint8) {
        return 6;
    }

    /**
     * @notice See {IEncryptedERC20-name}.
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /**
     * @notice See {IEncryptedERC20-symbol}.
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @notice See {IEncryptedERC20-totalSupply}.
     */
    function totalSupply() public view virtual returns (uint64) {
        return _totalSupply;
    }

    function _approve(address owner, address spender, euint64 amount) internal virtual {
        _allowances[owner][spender] = amount;
        TFHE.allowThis(amount);
        TFHE.allow(amount, owner);
        TFHE.allow(amount, spender);
    }

    function _transfer(address from, address to, euint64 amount, ebool isTransferable) internal virtual {
        // Add to the balance of `to` and subract from the balance of `from`.
        euint64 transferValue = TFHE.select(isTransferable, amount, TFHE.asEuint64(0));
        euint64 newBalanceTo = TFHE.add(_balances[to], transferValue);
        _balances[to] = newBalanceTo;
        TFHE.allowThis(newBalanceTo);
        TFHE.allow(newBalanceTo, to);
        euint64 newBalanceFrom = TFHE.sub(_balances[from], transferValue);
        _balances[from] = newBalanceFrom;
        TFHE.allowThis(newBalanceFrom);
        TFHE.allow(newBalanceFrom, from);
        emit Transfer(from, to);
    }

    function _updateAllowance(address owner, address spender, euint64 amount) internal virtual returns (ebool) {
        euint64 currentAllowance = _allowance(owner, spender);
        // Make sure sure the allowance suffices
        ebool allowedTransfer = TFHE.le(amount, currentAllowance);
        // Make sure the owner has enough tokens
        ebool canTransfer = TFHE.le(amount, _balances[owner]);
        ebool isTransferable = TFHE.and(canTransfer, allowedTransfer);
        _approve(owner, spender, TFHE.select(isTransferable, TFHE.sub(currentAllowance, amount), currentAllowance));
        return isTransferable;
    }

    function _allowance(address owner, address spender) internal view virtual returns (euint64) {
        return _allowances[owner][spender];
    }

    function _isSenderAllowedForAmount(euint64 amount) internal view virtual {
        if (!TFHE.isSenderAllowed(amount)) {
            revert TFHESenderNotAllowed();
        }
    }
}
