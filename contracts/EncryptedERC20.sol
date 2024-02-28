// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.20;

import "fhevm/lib/TFHE.sol";
import "fhevm/abstracts/Reencrypt.sol";
import "./utils/EncryptedErrors.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract EncryptedERC20 is Reencrypt, Ownable2Step, EncryptedErrors {
    enum ErrorCodes {
        NO_ERROR,
        UNSUFFICIENT_BALANCE,
        UNSUFFICIENT_APPROVAL
    }

    struct AllowedErrorReencryption {
        address spender; // account's address allowed to reencrypt errorCode
        euint8 errorCode;
    }

    event Transfer(uint256 indexed transferId, address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);
    event Mint(address indexed to, uint64 amount);

    uint64 internal _totalSupply;
    string private _name;
    string private _symbol;
    uint8 public constant decimals = 6;

    // A mapping from transferId to the AllowedErrorReencryption.
    mapping(uint256 => AllowedErrorReencryption) internal allowedErrorReencryptions;

    // A mapping from address to an encrypted balance.
    mapping(address => euint64) internal balances;

    // A mapping of the form mapping(owner => mapping(spender => allowance)).
    mapping(address => mapping(address => euint64)) internal allowances;

    constructor(
        string memory name_,
        string memory symbol_
    ) Ownable(msg.sender) EncryptedErrors(uint256(type(ErrorCodes).max) + 1) {
        _name = name_;
        _symbol = symbol_;
    }

    // Returns the name of the token.
    function name() public view virtual returns (string memory) {
        return _name;
    }

    // Returns the symbol of the token, usually a shorter version of the name.
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    // Returns the total supply of the token.
    function totalSupply() public view virtual returns (uint64) {
        return _totalSupply;
    }

    // Increase owner's balance by the given `mintedAmount`.
    function mint(uint64 mintedAmount) public virtual onlyOwner {
        _mint(mintedAmount);
    }

    // Increase sender's balance by the given `amount`.
    function _mint(uint64 amount) internal virtual {
        balances[msg.sender] = TFHE.add(balances[msg.sender], amount); // overflow impossible because of next line
        _totalSupply = _totalSupply + amount;
        emit Mint(msg.sender, amount);
    }

    // Transfers an encrypted amount from the message sender address to the `to` address.
    function transfer(address to, bytes calldata encryptedAmount) public virtual returns (bool) {
        transfer(to, TFHE.asEuint64(encryptedAmount));
        return true;
    }

    // Transfers an amount from the message sender address to the `to` address.
    function transfer(address to, euint64 amount) public virtual returns (bool) {
        // makes sure the owner has enough tokens
        ebool canTransfer = TFHE.le(amount, balances[msg.sender]);
        euint8 errorCode = defineErrorIfNot(canTransfer, uint8(ErrorCodes.UNSUFFICIENT_BALANCE));
        _transfer(msg.sender, to, amount, canTransfer, errorCode);
        return true;
    }

    // Returns the balance of the caller encrypted under the provided public key.
    function balanceOf(
        address wallet,
        bytes32 publicKey,
        bytes calldata signature
    ) public view virtual onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        require(wallet == msg.sender, "User cannot reencrypt a non-owned wallet balance");
        return TFHE.reencrypt(balances[wallet], publicKey, 0);
    }

    // Returns the encrypted balance of the caller.
    function balanceOfMe() public view virtual returns (euint64) {
        return balances[msg.sender];
    }

    // Sets the `encryptedAmount` as the allowance of `spender` over the caller's tokens.
    function approve(address spender, bytes calldata encryptedAmount) public virtual returns (bool) {
        approve(spender, TFHE.asEuint64(encryptedAmount));
        return true;
    }

    // Sets the `amount` as the allowance of `spender` over the caller's tokens.
    function approve(address spender, euint64 amount) public virtual returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        emit Approval(owner, spender);
        return true;
    }

    // Returns the remaining number of tokens that `spender` is allowed to spend
    // on behalf of the `owner`. The returned ciphertext is under the caller's `publicKey`.
    function allowance(
        address owner,
        address spender,
        bytes32 publicKey,
        bytes calldata signature
    ) public view virtual onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        require(owner == msg.sender || spender == msg.sender, "Caller must be owner or spender");
        return TFHE.reencrypt(_allowance(owner, spender), publicKey);
    }

    // Transfers `encryptedAmount` tokens using the caller's allowance.
    function transferFrom(address from, address to, bytes calldata encryptedAmount) public virtual returns (bool) {
        transferFrom(from, to, TFHE.asEuint64(encryptedAmount));
        return true;
    }

    // Transfers `amount` tokens using the caller's allowance.
    function transferFrom(address from, address to, euint64 amount) public virtual returns (bool) {
        address spender = msg.sender;
        (ebool isTransferable, euint8 errorCode) = _updateAllowance(from, spender, amount);
        _transfer(from, to, amount, isTransferable, errorCode);
        return true;
    }

    function _approve(address owner, address spender, euint64 amount) internal virtual {
        allowances[owner][spender] = amount;
    }

    function _allowance(address owner, address spender) internal view virtual returns (euint64) {
        if (TFHE.isInitialized(allowances[owner][spender])) {
            return allowances[owner][spender];
        } else {
            return TFHE.asEuint64(0);
        }
    }

    function _updateAllowance(address owner, address spender, euint64 amount) internal virtual returns (ebool, euint8) {
        euint64 currentAllowance = _allowance(owner, spender);
        // makes sure the allowance suffices
        ebool allowedTransfer = TFHE.le(amount, currentAllowance);
        euint8 errorCode = defineErrorIfNot(allowedTransfer, uint8(ErrorCodes.UNSUFFICIENT_APPROVAL));
        // makes sure the owner has enough tokens
        ebool canTransfer = TFHE.le(amount, balances[owner]);
        ebool isTransferable = TFHE.and(canTransfer, allowedTransfer);
        _approve(owner, spender, TFHE.cmux(isTransferable, currentAllowance - amount, currentAllowance));
        ebool isNotTransferableButIsApproved = TFHE.and(TFHE.not(canTransfer), allowedTransfer);
        errorCode = changeErrorIf(
            isNotTransferableButIsApproved, // should indeed check that spender is approved to not leak information
            // on balance of `from` to unauthorized spender via calling reencryptTransferError afterwards
            uint8(ErrorCodes.UNSUFFICIENT_BALANCE),
            errorCode
        );
        return (isTransferable, errorCode);
    }

    // Transfers an encrypted amount.
    function _transfer(
        address from,
        address to,
        euint64 amount,
        ebool isTransferable,
        euint8 errorCode
    ) internal virtual {
        // Add to the balance of `to` and subract from the balance of `from`.
        euint64 amountTransferred = TFHE.cmux(isTransferable, amount, TFHE.asEuint64(0));
        balances[to] = balances[to] + amountTransferred;
        balances[from] = balances[from] - amountTransferred;
        uint256 transferId = saveError(errorCode);
        emit Transfer(transferId, from, to);
        AllowedErrorReencryption memory allowedErrorReencryption = AllowedErrorReencryption(
            msg.sender,
            getError(transferId)
        );
        allowedErrorReencryptions[transferId] = allowedErrorReencryption;
    }

    // Returns the error code corresponding to transferId.
    // The returned ciphertext is under the caller's `publicKey`.
    function reencryptError(
        uint256 transferId,
        bytes32 publicKey,
        bytes calldata signature
    ) external view virtual onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        AllowedErrorReencryption memory allowedErrorReencryption = allowedErrorReencryptions[transferId];
        euint8 errorCode = allowedErrorReencryption.errorCode;
        require(TFHE.isInitialized(errorCode), "Invalid transferId");
        require(msg.sender == allowedErrorReencryption.spender, "Only spender can reencrypt his error");
        return TFHE.reencrypt(errorCode, publicKey);
    }
}
