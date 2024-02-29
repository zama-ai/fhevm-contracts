# Solidity API

## EncryptedERC20

### ErrorCodes

```solidity
enum ErrorCodes {
  NO_ERROR,
  UNSUFFICIENT_BALANCE,
  UNSUFFICIENT_APPROVAL
}
```

### AllowedErrorReencryption

```solidity
struct AllowedErrorReencryption {
  address spender;
  euint8 errorCode;
}
```

### Transfer

```solidity
event Transfer(uint256 transferId, address from, address to)
```

### Approval

```solidity
event Approval(address owner, address spender)
```

### Mint

```solidity
event Mint(address to, uint64 amount)
```

### \_totalSupply

```solidity
uint64 _totalSupply
```

### decimals

```solidity
uint8 decimals
```

### allowedErrorReencryptions

```solidity
mapping(uint256 => struct EncryptedERC20.AllowedErrorReencryption) allowedErrorReencryptions
```

### balances

```solidity
mapping(address => euint64) balances
```

### allowances

```solidity
mapping(address => mapping(address => euint64)) allowances
```

### constructor

```solidity
constructor(string name_, string symbol_) public
```

### name

```solidity
function name() public view virtual returns (string)
```

### symbol

```solidity
function symbol() public view virtual returns (string)
```

### totalSupply

```solidity
function totalSupply() public view virtual returns (uint64)
```

### mint

```solidity
function mint(uint64 mintedAmount) public virtual
```

### \_mint

```solidity
function _mint(uint64 amount) internal virtual
```

### transfer

```solidity
function transfer(address to, bytes encryptedAmount) public virtual returns (bool)
```

### transfer

```solidity
function transfer(address to, euint64 amount) public virtual returns (bool)
```

### balanceOf

```solidity
function balanceOf(address wallet, bytes32 publicKey, bytes signature) public view virtual returns (bytes)
```

### balanceOfMe

```solidity
function balanceOfMe() public view virtual returns (euint64)
```

### approve

```solidity
function approve(address spender, bytes encryptedAmount) public virtual returns (bool)
```

### approve

```solidity
function approve(address spender, euint64 amount) public virtual returns (bool)
```

### allowance

```solidity
function allowance(address owner, address spender, bytes32 publicKey, bytes signature) public view virtual returns (bytes)
```

### transferFrom

```solidity
function transferFrom(address from, address to, bytes encryptedAmount) public virtual returns (bool)
```

### transferFrom

```solidity
function transferFrom(address from, address to, euint64 amount) public virtual returns (bool)
```

### \_approve

```solidity
function _approve(address owner, address spender, euint64 amount) internal virtual
```

### \_allowance

```solidity
function _allowance(address owner, address spender) internal view virtual returns (euint64)
```

### \_updateAllowance

```solidity
function _updateAllowance(address owner, address spender, euint64 amount) internal virtual returns (ebool, euint8)
```

### \_transfer

```solidity
function _transfer(address from, address to, euint64 amount, ebool isTransferable, euint8 errorCode) internal virtual
```

### reencryptError

```solidity
function reencryptError(uint256 transferId, bytes32 publicKey, bytes signature) external view virtual returns (bytes)
```
