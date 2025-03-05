## IConfidentialERC20

Interface that defines ERC20-like tokens with encrypted balances.

### Approval

```solidity
event Approval(address owner, address spender, uint256 placeholder)
```

Emitted when the allowance of a `spender` for an `owner` is set by a call to {approve}.

#### Parameters

| Name        | Type    | Description      |
| ----------- | ------- | ---------------- |
| owner       | address | Owner address.   |
| spender     | address | Spender address. |
| placeholder | uint256 | Placeholder.     |

### Transfer

```solidity
event Transfer(address from, address to, uint256 errorId)
```

Emitted when tokens are moved from one account (`from`) to another (`to`).

#### Parameters

| Name       | Type    | Description                                                                                                                                                                                                                       |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| from       | address | Sender address.                                                                                                                                                                                                                   |
| to         | address | Receiver address.                                                                                                                                                                                                                 |
| transferId | uint256 | If the implementation does not support error handling, it must be set to a default placeholder (typically equal to max(uint256). However, it must be set to a transferId if the implementation supports encrypted error handling. |

### approve

```solidity
function approve(address spender, einput encryptedAmount, bytes inputProof) external returns (bool)
```

Set the `encryptedAmount` as the allowance of `spender` over the caller's tokens.

#### Parameters

| Name            | Type    | Description       |
| --------------- | ------- | ----------------- |
| spender         | address | Spender address.  |
| encryptedAmount | einput  | Encrypted amount. |
| inputProof      | bytes   | Input proof.      |

#### Return Values

| Name      | Type | Description          |
| --------- | ---- | -------------------- |
| isSuccess | bool | Whether it succeeds. |

### approve

```solidity
function approve(address spender, euint64 amount) external returns (bool)
```

Set the `amount` as the allowance of `spender` over the caller's tokens.

#### Parameters

| Name    | Type    | Description       |
| ------- | ------- | ----------------- |
| spender | address | Spender address.  |
| amount  | euint64 | Encrypted amount. |

#### Return Values

| Name | Type | Description                    |
| ---- | ---- | ------------------------------ |
| [0]  | bool | isSuccess Whether it succeeds. |

### transfer

```solidity
function transfer(address to, einput encryptedAmount, bytes inputProof) external returns (bool)
```

Transfer an encrypted amount from the message sender address to the `to` address.

#### Parameters

| Name            | Type    | Description       |
| --------------- | ------- | ----------------- |
| to              | address | Receiver address. |
| encryptedAmount | einput  | Encrypted amount. |
| inputProof      | bytes   | Input proof.      |

#### Return Values

| Name      | Type | Description          |
| --------- | ---- | -------------------- |
| isSuccess | bool | Whether it succeeds. |

### transfer

```solidity
function transfer(address to, euint64 amount) external returns (bool)
```

Transfer an amount from the message sender address to the `to` address.

#### Parameters

| Name   | Type    | Description       |
| ------ | ------- | ----------------- |
| to     | address | Receiver address. |
| amount | euint64 | Encrypted amount. |

#### Return Values

| Name      | Type | Description          |
| --------- | ---- | -------------------- |
| isSuccess | bool | Whether it succeeds. |

### transferFrom

```solidity
function transferFrom(address from, address to, euint64 amount) external returns (bool)
```

Transfer `amount` tokens using the caller's allowance.

#### Parameters

| Name   | Type    | Description       |
| ------ | ------- | ----------------- |
| from   | address | Sender address.   |
| to     | address | Receiver address. |
| amount | euint64 | Encrypted amount. |

#### Return Values

| Name      | Type | Description          |
| --------- | ---- | -------------------- |
| isSuccess | bool | Whether it succeeds. |

### transferFrom

```solidity
function transferFrom(address from, address to, einput encryptedAmount, bytes inputProof) external returns (bool)
```

Transfer `encryptedAmount` tokens using the caller's allowance.

#### Parameters

| Name            | Type    | Description       |
| --------------- | ------- | ----------------- |
| from            | address | Sender address.   |
| to              | address | Receiver address. |
| encryptedAmount | einput  | Encrypted amount. |
| inputProof      | bytes   | Input proof.      |

#### Return Values

| Name      | Type | Description          |
| --------- | ---- | -------------------- |
| isSuccess | bool | Whether it succeeds. |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (euint64)
```

Return the remaining number of tokens that `spender` is allowed to spend on behalf of the `owner`.

#### Parameters

| Name    | Type    | Description      |
| ------- | ------- | ---------------- |
| owner   | address | Owner address.   |
| spender | address | Spender address. |

#### Return Values

| Name      | Type    | Description                                             |
| --------- | ------- | ------------------------------------------------------- |
| allowance | euint64 | Allowance handle of the spender on behalf of the owner. |

### balanceOf

```solidity
function balanceOf(address account) external view returns (euint64)
```

Return the balance handle of the `account`.

#### Parameters

| Name    | Type    | Description      |
| ------- | ------- | ---------------- |
| account | address | Account address. |

#### Return Values

| Name    | Type    | Description                      |
| ------- | ------- | -------------------------------- |
| balance | euint64 | Balance handle of the `account`. |

### decimals

```solidity
function decimals() external view returns (uint8)
```

Return the number of decimals.

#### Return Values

| Name     | Type  | Description                  |
| -------- | ----- | ---------------------------- |
| decimals | uint8 | Number of decimals (e.g. 6). |

### name

```solidity
function name() external view returns (string)
```

Return the name of the token.

#### Return Values

| Name | Type   | Description                           |
| ---- | ------ | ------------------------------------- |
| name | string | Name of the token (e.g. "TestToken"). |

### symbol

```solidity
function symbol() external view returns (string)
```

Return the symbol of the token.

#### Return Values

| Name   | Type   | Description                        |
| ------ | ------ | ---------------------------------- |
| symbol | string | Symbol of the token (e.g. "TEST"). |

### totalSupply

```solidity
function totalSupply() external view returns (uint64)
```

Return the total supply of the token.

#### Return Values

| Name        | Type   | Description                |
| ----------- | ------ | -------------------------- |
| totalSupply | uint64 | Total supply of the token. |
