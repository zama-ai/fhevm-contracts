# EncryptedERC20WithErrorsMintable

This contract inherits EncryptedERC20WithErrors.

_It allows an owner to mint tokens. Mint amounts are public._

## Mint

```solidity
event Mint(address to, uint64 amount)
```

Emitted when `amount` tokens are minted to one account (`to`).

## constructor

```solidity
constructor(string name_, string symbol_, address owner_) internal
```

### Parameters

| Name     | Type    | Description        |
| -------- | ------- | ------------------ |
| name\_   | string  | Name of the token. |
| symbol\_ | string  | Symbol.            |
| owner\_  | address | Owner address.     |

## mint

```solidity
function mint(uint64 amount) public virtual
```

Mint tokens.

### Parameters

| Name   | Type   | Description               |
| ------ | ------ | ------------------------- |
| amount | uint64 | Amount of tokens to mint. |
