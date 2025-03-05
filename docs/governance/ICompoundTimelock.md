## ICompoundTimelock

_The CompoundTimelock inherits this interface._

### DelayBelowMinimumDelay

```solidity
error DelayBelowMinimumDelay()
```

Returned if the delay is below the minimum delay.

### DelayAboveMaximumDelay

```solidity
error DelayAboveMaximumDelay()
```

Returned if the delay exceeds the maximum delay.

### ExecutionReverted

```solidity
error ExecutionReverted()
```

Returned if the transaction's execution reverted.

### SenderIsNotAdmin

```solidity
error SenderIsNotAdmin()
```

Returned if the `msg.sender` is not the admin.

### SenderIsNotTimelock

```solidity
error SenderIsNotTimelock()
```

Returned if the `msg.sender` is not this contract (`CompoundTimelock`).

### SenderIsNotPendingAdmin

```solidity
error SenderIsNotPendingAdmin()
```

Returned if the `msg.sender` is not `pendingAdmin`.

### TransactionNotQueued

```solidity
error TransactionNotQueued()
```

Returned if the transaction has not been queued.

### TransactionTooEarlyForExecution

```solidity
error TransactionTooEarlyForExecution()
```

Returned if the transaction has not surpassed the time lock.

### TransactionTooEarlyForQueuing

```solidity
error TransactionTooEarlyForQueuing()
```

Returned if the estimated execution block does not satisfay the delay.

### TransactionTooLateForExecution

```solidity
error TransactionTooLateForExecution()
```

Returned if the transaction is stale (too late for execution).

### NewAdmin

```solidity
event NewAdmin(address newAdmin)
```

Emitted when there is a change of admin.

### NewPendingAdmin

```solidity
event NewPendingAdmin(address newPendingAdmin)
```

Emtited when there is a change of pending admin.

### NewDelay

```solidity
event NewDelay(uint256 newDelay)
```

Emitted when there is a new delay set.

### CancelTransaction

```solidity
event CancelTransaction(bytes32 txHash, address target, uint256 value, string signature, bytes data, uint256 eta)
```

Emitted when the queued transaction is canceled.

### ExecuteTransaction

```solidity
event ExecuteTransaction(bytes32 txHash, address target, uint256 value, string signature, bytes data, uint256 eta)
```

Emitted when the queued transaction is executed.

### QueueTransaction

```solidity
event QueueTransaction(bytes32 txHash, address target, uint256 value, string signature, bytes data, uint256 eta)
```

Emitted when a transaction is queued.

### delay

```solidity
function delay() external view returns (uint256)
```

Returns the delay (in timestamp) for a queued transaction before it can be executed.

### GRACE_PERIOD

```solidity
function GRACE_PERIOD() external view returns (uint256)
```

Returns the grace period (in timestamp). The grace period indicates how long a transaction can remain queued before it
cannot be executed again.

### acceptAdmin

```solidity
function acceptAdmin() external
```

Accept admin role.

### queuedTransactions

```solidity
function queuedTransactions(bytes32 hash) external view returns (bool)
```

Returns whether the transactions are queued.

### queueTransaction

```solidity
function queueTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external returns (bytes32 hashTransaction)
```

Queue a transaction.

#### Parameters

| Name      | Type    | Description                                |
| --------- | ------- | ------------------------------------------ |
| target    | address | Target address to execute the transaction. |
| value     | uint256 |                                            |
| signature | string  | Function signature to execute.             |
| data      | bytes   | The data to include in the transaction.    |
| eta       | uint256 | The earliest eta to queue the transaction. |

#### Return Values

| Name            | Type    | Description             |
| --------------- | ------- | ----------------------- |
| hashTransaction | bytes32 | The transaction's hash. |

### cancelTransaction

```solidity
function cancelTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external
```

Cancel a queued transaction.

#### Parameters

| Name      | Type    | Description                                |
| --------- | ------- | ------------------------------------------ |
| target    | address | Target address to execute the transaction. |
| value     | uint256 |                                            |
| signature | string  | Function signature to execute.             |
| data      | bytes   | The data to include in the transaction.    |
| eta       | uint256 | The earliest eta to queue the transaction. |

### executeTransaction

```solidity
function executeTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external payable returns (bytes response)
```

Cancel a queued transaction.

#### Parameters

| Name      | Type    | Description                                |
| --------- | ------- | ------------------------------------------ |
| target    | address | Target address to execute the transaction. |
| value     | uint256 |                                            |
| signature | string  | Function signature to execute.             |
| data      | bytes   | The data to include in the transaction.    |
| eta       | uint256 | The earliest eta to queue the transaction. |

#### Return Values

| Name     | Type  | Description                                      |
| -------- | ----- | ------------------------------------------------ |
| response | bytes | The response from the transaction once executed. |
