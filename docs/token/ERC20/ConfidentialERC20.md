## ConfidentialERC20

This contract implements an encrypted ERC20-like token with confidential balances using Zama's FHE (Fully Homomorphic
Encryption) library.

_It supports standard ERC20 functions such as transferring tokens, minting, and setting allowances, but uses encrypted
data types. The total supply is not encrypted._

### \_PLACEHOLDER

```solidity
uint256 _PLACEHOLDER
```

Used as a placeholder in `Approval` & `Transfer` events to comply with the official EIP20.

### \_totalSupply

```solidity
uint64 _totalSupply
```

Total supply.

### \_name

```solidity
string _name
```

Name.

### \_symbol

```solidity
string _symbol
```

Symbol.

### \_balances

```solidity
mapping(address => euint64) _balances
```

A mapping from `account` address to an encrypted `balance`.

### \_allowances

```solidity
mapping(address => mapping(address => euint64)) _allowances
```

A mapping of the form mapping(account => mapping(spender => allowance)).

### constructor

```solidity
constructor(string name_, string symbol_) internal
```

#### Parameters

| Name     | Type   | Description        |
| -------- | ------ | ------------------ |
| name\_   | string | Name of the token. |
| symbol\_ | string | Symbol.            |

### approve

```solidity
function approve(address spender, einput encryptedAmount, bytes inputProof) public virtual returns (bool)
```

See {IConfidentialERC20-approve}.

### approve

```solidity
function approve(address spender, euint64 amount) public virtual returns (bool)
```

See {IConfidentialERC20-approve}.

### transfer

```solidity
function transfer(address to, einput encryptedAmount, bytes inputProof) public virtual returns (bool)
```

See {IConfidentialERC20-transfer}.

### transfer

```solidity
function transfer(address to, euint64 amount) public virtual returns (bool)
```

See {IConfidentialERC20-transfer}.

### transferFrom

```solidity
function transferFrom(address from, address to, einput encryptedAmount, bytes inputProof) public virtual returns (bool)
```

See {IConfidentialERC20-transferFrom}.

### transferFrom

```solidity
function transferFrom(address from, address to, euint64 amount) public virtual returns (bool)
```

See {IConfidentialERC20-transferFrom}.

### allowance

```solidity
function allowance(address owner, address spender) public view virtual returns (euint64)
```

See {IConfidentialERC20-allowance}.

### balanceOf

```solidity
function balanceOf(address account) public view virtual returns (euint64)
```

See {IConfidentialERC20-balanceOf}.

### decimals

```solidity
function decimals() public view virtual returns (uint8)
```

See {IConfidentialERC20-decimals}.

### name

```solidity
function name() public view virtual returns (string)
```

See {IConfidentialERC20-name}.

### symbol

```solidity
function symbol() public view virtual returns (string)
```

See {IConfidentialERC20-symbol}.

### totalSupply

```solidity
function totalSupply() public view virtual returns (uint64)
```

See {IConfidentialERC20-totalSupply}.

### \_approve

```solidity
function _approve(address owner, address spender, euint64 amount) internal virtual
```

### \_unsafeMint

```solidity
function _unsafeMint(address account, uint64 amount) internal virtual
```

_It does not incorporate any overflow check. It must be implemented by the function calling it._

### \_unsafeMintNoEvent

```solidity
function _unsafeMintNoEvent(address account, uint64 amount) internal virtual
```

_It does not incorporate any overflow check. It must be implemented by the function calling it._

### \_transfer

```solidity
function _transfer(address from, address to, euint64 amount, ebool isTransferable) internal virtual
```

### \_transferNoEvent

```solidity
function _transferNoEvent(address from, address to, euint64 amount, ebool isTransferable) internal virtual
```

### \_updateAllowance

```solidity
function _updateAllowance(address owner, address spender, euint64 amount) internal virtual returns (ebool)
```

### \_allowance

```solidity
function _allowance(address owner, address spender) internal view virtual returns (euint64)
```

### \_isSenderAllowedForAmount

```solidity
function _isSenderAllowedForAmount(euint64 amount) internal view virtual
```
