## ConfidentialVestingWallet

This contract offers a simple vesting wallet for [ConfidentialERC20](../token/ERC20/IConfidentialERC20.md) tokens. This
is based on the
[VestingWallet.sol contract written by OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.1/contracts/finance/VestingWallet.sol).

_Default implementation is a linear vesting curve. To use with the native asset, it is necessary to wrap the native
asset to a ConfidentialERC20-like token._

### ConfidentialERC20Released

```solidity
event ConfidentialERC20Released(address token)
```

Emitted when tokens are released to the beneficiary address.

#### Parameters

| Name  | Type    | Description                          |
| ----- | ------- | ------------------------------------ |
| token | address | Address of the token being released. |

### BENEFICIARY

```solidity
address BENEFICIARY
```

Beneficiary address.

### DURATION

```solidity
uint128 DURATION
```

Duration (in seconds).

### END_TIMESTAMP

```solidity
uint128 END_TIMESTAMP
```

End timestamp.

### START_TIMESTAMP

```solidity
uint128 START_TIMESTAMP
```

Start timestamp.

### \_EUINT64_ZERO

```solidity
euint64 _EUINT64_ZERO
```

Constant for zero using TFHE.

_Since it is expensive to compute 0, it is stored instead._

### \_amountReleased

```solidity
mapping(address => euint64) _amountReleased
```

Total encrypted amount released (to the beneficiary).

### constructor

```solidity
constructor(address beneficiary_, uint128 startTimestamp_, uint128 duration_) internal
```

#### Parameters

| Name             | Type    | Description            |
| ---------------- | ------- | ---------------------- |
| beneficiary\_    | address | Beneficiary address.   |
| startTimestamp\_ | uint128 | Start timestamp.       |
| duration\_       | uint128 | Duration (in seconds). |

### release

```solidity
function release(address token) public virtual
```

Release the tokens that have already vested.

_Anyone can call this function but the beneficiary receives the tokens._

### released

```solidity
function released(address token) public view virtual returns (euint64 amountReleased)
```

Return the encrypted amount of total tokens released.

_It is only reencryptable by the owner._

#### Return Values

| Name           | Type    | Description                      |
| -------------- | ------- | -------------------------------- |
| amountReleased | euint64 | Total amount of tokens released. |

### \_releasable

```solidity
function _releasable(address token) internal virtual returns (euint64 releasableAmount)
```

Calculate the amount of tokens that can be released.

#### Return Values

| Name             | Type    | Description        |
| ---------------- | ------- | ------------------ |
| releasableAmount | euint64 | Releasable amount. |

### \_vestedAmount

```solidity
function _vestedAmount(address token, uint128 timestamp) internal virtual returns (euint64 vestedAmount)
```

Calculate the amount of tokens that has already vested.

#### Parameters

| Name      | Type    | Description        |
| --------- | ------- | ------------------ |
| token     | address |                    |
| timestamp | uint128 | Current timestamp. |

#### Return Values

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| vestedAmount | euint64 | Vested amount. |

### \_vestingSchedule

```solidity
function _vestingSchedule(euint64 totalAllocation, uint128 timestamp) internal virtual returns (euint64 vestedAmount)
```

Return the vested amount based on a linear vesting schedule.

_It must be overriden for non-linear schedules._

#### Parameters

| Name            | Type    | Description                      |
| --------------- | ------- | -------------------------------- |
| totalAllocation | euint64 | Total allocation that is vested. |
| timestamp       | uint128 | Current timestamp.               |

#### Return Values

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| vestedAmount | euint64 | Vested amount. |
