## ConfidentialERC20WithErrors

This contract implements an encrypted ERC20-like token with confidential balances using Zama's FHE (Fully Homomorphic
Encryption) library.

_It supports standard ERC20 functions such as transferring tokens, minting, and setting allowances, but uses encrypted
data types. The total supply is not encrypted. It also supports error handling for encrypted errors._

### ErrorCodes

Error codes allow tracking (in the storage) whether a transfer worked.

\_NO_ERROR: the transfer worked as expected. UNSUFFICIENT_BALANCE: the transfer failed because the from balances were
strictly inferior to the amount to transfer. UNSUFFICIENT_APPROVAL: the transfer failed because the sender allowance
wasstrictly lower than the amount to transfer.

```solidity
enum ErrorCodes {
  NO_ERROR,
  UNSUFFICIENT_BALANCE,
  UNSUFFICIENT_APPROVAL
}
```

### constructor

```solidity
constructor(string name_, string symbol_) internal
```

#### Parameters

| Name     | Type   | Description        |
| -------- | ------ | ------------------ |
| name\_   | string | Name of the token. |
| symbol\_ | string | Symbol.            |

### transfer

```solidity
function transfer(address to, euint64 amount) public virtual returns (bool)
```

See {IConfidentialERC20-transfer}.

### transferFrom

```solidity
function transferFrom(address from, address to, euint64 amount) public virtual returns (bool)
```

See {IConfidentialERC20-transferFrom}.

### getErrorCodeForTransferId

```solidity
function getErrorCodeForTransferId(uint256 transferId) public view virtual returns (euint8 errorCode)
```

Return the error for a transfer id.

#### Parameters

| Name       | Type    | Description                                            |
| ---------- | ------- | ------------------------------------------------------ |
| transferId | uint256 | Transfer id. It can be read from the `Transfer` event. |

#### Return Values

| Name      | Type   | Description           |
| --------- | ------ | --------------------- |
| errorCode | euint8 | Encrypted error code. |

### \_transfer

```solidity
function _transfer(address from, address to, euint64 amount, ebool isTransferable) internal
```

### \_updateAllowance

```solidity
function _updateAllowance(address owner, address spender, euint64 amount) internal virtual returns (ebool isTransferable)
```
