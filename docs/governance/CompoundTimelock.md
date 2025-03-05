## CompoundTimelock

This contract allows the admin to set a delay period before executing transactions. Transactions must be queued before
execution. No transaction can be executed during this period, which offers time to verify the validity of pending
transactions. It also has a grace period to allow for transactions not to be executed after a specific period following
the queuing.

### GRACE_PERIOD

```solidity
uint256 GRACE_PERIOD
```

See {ICompoundTimelock-GRACE_PERIOD}.

### MINIMUM_DELAY

```solidity
uint256 MINIMUM_DELAY
```

Minimum delay that can be set in the `setDelay` function.

### MAXIMUM_DELAY

```solidity
uint256 MAXIMUM_DELAY
```

Maximum delay that can be set in the `setDelay` function.

### admin

```solidity
address admin
```

Admin address.

### pendingAdmin

```solidity
address pendingAdmin
```

Pending admin address.

_The transer of the admin is a two-step process._

### delay

```solidity
uint256 delay
```

See {ICompoundTimelock-delay}.

### queuedTransactions

```solidity
mapping(bytes32 => bool) queuedTransactions
```

Return whether the transaction is queued based on its hash.

### constructor

```solidity
constructor(address admin_, uint256 delay_) public
```

#### Parameters

| Name    | Type    | Description           |
| ------- | ------- | --------------------- |
| admin\_ | address | Admin address.        |
| delay\_ | uint256 | Delay (in timestamp). |

### receive

```solidity
receive() external payable
```

### setDelay

```solidity
function setDelay(uint256 delay_) public
```

Set the delay.

_This transaction must be queued._

#### Parameters

| Name    | Type    | Description           |
| ------- | ------- | --------------------- |
| delay\_ | uint256 | Delay (in timestamp). |

### acceptAdmin

```solidity
function acceptAdmin() public
```

See {ICompoundTimelock-acceptAdmin}.

### setPendingAdmin

```solidity
function setPendingAdmin(address pendingAdmin_) public
```

Set the pending admin.

_This transaction must be queued._

#### Parameters

| Name           | Type    | Description            |
| -------------- | ------- | ---------------------- |
| pendingAdmin\_ | address | Pending admin address. |

### queueTransaction

```solidity
function queueTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) public returns (bytes32)
```

See {ICompoundTimelock-queueTransaction}.

### cancelTransaction

```solidity
function cancelTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) public
```

See {ICompoundTimelock-cancelTransaction}.

### executeTransaction

```solidity
function executeTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) public payable returns (bytes)
```

See {ICompoundTimelock-executeTransaction}.
