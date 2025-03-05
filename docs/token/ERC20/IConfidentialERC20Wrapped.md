## IConfidentialERC20Wrapped

Interface that defines events, errors, and structs for contracts that wrap native assets or ERC20 tokens.

### AmountTooHigh

```solidity
error AmountTooHigh()
```

Returned if the amount is greater than 2\*\*64.

### CannotTransferOrUnwrap

```solidity
error CannotTransferOrUnwrap()
```

Returned if user cannot transfer or mint.

### Unwrap

```solidity
event Unwrap(address account, uint64 amount)
```

Emitted when token is unwrapped.

#### Parameters

| Name    | Type    | Description                                 |
| ------- | ------- | ------------------------------------------- |
| account | address | Address of the account that unwraps tokens. |
| amount  | uint64  | Amount to unwrap.                           |

### UnwrapFailNotEnoughBalance

```solidity
event UnwrapFailNotEnoughBalance(address account, uint64 amount)
```

Emitted if unwrap fails due to lack of funds.

#### Parameters

| Name    | Type    | Description                                  |
| ------- | ------- | -------------------------------------------- |
| account | address | Address of the account that tried to unwrap. |
| amount  | uint64  | Amount to unwrap.                            |

### UnwrapFailTransferFail

```solidity
event UnwrapFailTransferFail(address account, uint64 amount)
```

Emitted if unwrap fails due to fail transfer.

#### Parameters

| Name    | Type    | Description                                  |
| ------- | ------- | -------------------------------------------- |
| account | address | Address of the account that tried to unwrap. |
| amount  | uint64  | Amount to unwrap.                            |

### Wrap

```solidity
event Wrap(address account, uint64 amount)
```

Emitted when token is wrapped.

#### Parameters

| Name    | Type    | Description                               |
| ------- | ------- | ----------------------------------------- |
| account | address | Address of the account that wraps tokens. |
| amount  | uint64  | Amount to wrap.                           |

### UnwrapRequest

This struct keeps track of the unwrap request information.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct UnwrapRequest {
  address account;
  uint64 amount;
}
```
