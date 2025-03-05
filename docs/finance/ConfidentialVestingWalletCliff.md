## ConfidentialVestingWalletCliff

This contract offers a simple vesting wallet with a cliff for [ConfidentialERC20](../token/ERC20/IConfidentialERC20.md)
tokens. This is based on the
[VestingWalletCliff.sol contract written by OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.1/contracts/finance/VestingWalletCliff.sol).

_This implementation is a linear vesting curve with a cliff. To use with the native asset, it is necessary to wrap the
native asset to a ConfidentialERC20-like token._

### InvalidCliffDuration

```solidity
error InvalidCliffDuration(uint128 cliffSeconds, uint128 durationSeconds)
```

Returned if the cliff duration is greater than the vesting duration.

### CLIFF

```solidity
uint128 CLIFF
```

Cliff timestamp.

### constructor

```solidity
constructor(address beneficiary_, uint128 startTimestamp_, uint128 duration_, uint128 cliffSeconds_) internal
```

#### Parameters

| Name             | Type    | Description            |
| ---------------- | ------- | ---------------------- |
| beneficiary\_    | address | Beneficiary address.   |
| startTimestamp\_ | uint128 | Start timestamp.       |
| duration\_       | uint128 | Duration (in seconds). |
| cliffSeconds\_   | uint128 | Cliff (in seconds).    |

### \_vestingSchedule

```solidity
function _vestingSchedule(euint64 totalAllocation, uint128 timestamp) internal virtual returns (euint64)
```

Return the vested amount based on a linear vesting schedule with a cliff.

#### Parameters

| Name            | Type    | Description                      |
| --------------- | ------- | -------------------------------- |
| totalAllocation | euint64 | Total allocation that is vested. |
| timestamp       | uint128 | Current timestamp.               |

#### Return Values

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| vestedAmount | euint64 | Vested amount. |
