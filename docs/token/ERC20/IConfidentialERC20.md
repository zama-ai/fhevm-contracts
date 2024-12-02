# IConfidentialERC20

Interface that defines ERC20-like tokens with encrypted balances.

## Approval

```solidity
event Approval(address owner, address spender)
```

Emitted when the allowance of a `spender` for an `owner` is set by a call to {approve}.

## Transfer

```solidity
event Transfer(address from, address to)
```

Emitted when tokens are moved from one account (`from`) to another (`to`).

## ReceiverAddressNull

```solidity
error ReceiverAddressNull()
```

Returned when receiver is address(0).

## SenderAddressNull

```solidity
error SenderAddressNull()
```

Returned when sender is address(0).

## approve

```solidity
function approve(address spender, einput encryptedAmount, bytes inputProof) external returns (bool)
```

Sets the `encryptedAmount` as the allowance of `spender` over the caller's tokens.

## approve

```solidity
function approve(address spender, euint64 amount) external returns (bool)
```

Sets the `amount` as the allowance of `spender` over the caller's tokens.

## transfer

```solidity
function transfer(address to, einput encryptedAmount, bytes inputProof) external returns (bool)
```

Transfers an encrypted amount from the message sender address to the `to` address.

## transfer

```solidity
function transfer(address to, euint64 amount) external returns (bool)
```

Transfers an amount from the message sender address to the `to` address.

## transferFrom

```solidity
function transferFrom(address from, address to, euint64 amount) external returns (bool)
```

Transfers `amount` tokens using the caller's allowance.

## transferFrom

```solidity
function transferFrom(address from, address to, einput encryptedAmount, bytes inputProof) external returns (bool)
```

Transfers `encryptedAmount` tokens using the caller's allowance.

## allowance

```solidity
function allowance(address owner, address spender) external view returns (euint64)
```

Returns the remaining number of tokens that `spender` is allowed to spend on behalf of the caller.

## balanceOf

```solidity
function balanceOf(address wallet) external view returns (euint64)
```

Returns the balance handle of the caller.

## decimals

```solidity
function decimals() external view returns (uint8)
```

Returns the number of decimals.

## name

```solidity
function name() external view returns (string)
```

Returns the name of the token.

## symbol

```solidity
function symbol() external view returns (string)
```

Returns the symbol of the token, usually a shorter version of the name.

## totalSupply

```solidity
function totalSupply() external view returns (uint64)
```

Returns the total supply of the token.
