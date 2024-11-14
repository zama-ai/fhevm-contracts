# EncryptedERC20WithErrors

This contract implements an encrypted ERC20-like token with confidential balances using Zama's FHE (Fully Homomorphic
Encryption) library.

It supports standard ERC20 functions such as transferring tokens, minting, and setting allowances, but uses encrypted
data types. The total supply is not encrypted. It also supports error handling for encrypted errors.

## TransferWithErrorHandling

```solidity
event TransferWithErrorHandling(address from, address to, uint256 transferId)
```

Emitted when tokens are moved from one account (`from`) to another (`to`).

## ErrorCodes

Error codes allow tracking (in the storage) whether a transfer worked.

| Name                  | Description                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| NO_ERROR              | The transfer worked as expected.                                                                 |
| UNSUFFICIENT_BALANCE  | The transfer failed because the from balances were strictly inferior to the amount to transfer.  |
| UNSUFFICIENT_APPROVAL | The transfer failed because the sender allowance was strictly lower than the amount to transfer. |

```solidity
enum ErrorCodes {
  NO_ERROR,
  UNSUFFICIENT_BALANCE,
  UNSUFFICIENT_APPROVAL
}
```

## \_errorCodeForTransferId

```solidity
mapping(uint256 => euint8) _errorCodeForTransferId
```

A mapping from transferId to the error code.

## constructor

```solidity
constructor(string name_, string symbol_) internal
```

### Parameters

| Name     | Type   | Description        |
| -------- | ------ | ------------------ |
| name\_   | string | Name of the token. |
| symbol\_ | string | Symbol.            |

## transfer

```solidity
function transfer(address to, euint64 amount) public virtual returns (bool)
```

See {IEncryptedERC20-transfer}.

## transferFrom

```solidity
function transferFrom(address from, address to, euint64 amount) public virtual returns (bool)
```

See {IEncryptedERC20-transferFrom}.

## getErrorCodeForTransferId

```solidity
function getErrorCodeForTransferId(uint256 transferId) public view virtual returns (euint8 errorCode)
```

Returns the error code corresponding to `transferId`.

## \_transferWithErrorCode

```solidity
function _transferWithErrorCode(address from, address to, euint64 amount, ebool isTransferable, euint8 errorCode) internal virtual
```

## \_updateAllowanceWithErrorCode

```solidity
function _updateAllowanceWithErrorCode(address owner, address spender, euint64 amount) internal virtual returns (ebool isTransferable, euint8 errorCode)
```
