# Solidity API

## Comp

### allowedContract

```solidity
address allowedContract
```

allowed smart contract

### delegates

```solidity
mapping(address => address) delegates
```

A record of each accounts delegate

### Checkpoint

A checkpoint for marking number of votes from a given block

```solidity
struct Checkpoint {
  uint32 fromBlock;
  euint64 votes;
}
```

### checkpoints

```solidity
mapping(address => mapping(uint32 => struct Comp.Checkpoint)) checkpoints
```

A record of votes checkpoints for each account, by index

### numCheckpoints

```solidity
mapping(address => uint32) numCheckpoints
```

The number of checkpoints for each account

### DOMAIN_TYPEHASH

```solidity
bytes32 DOMAIN_TYPEHASH
```

The EIP-712 typehash for the contract's domain

### DELEGATION_TYPEHASH

```solidity
bytes32 DELEGATION_TYPEHASH
```

The EIP-712 typehash for the delegation struct used by the contract

### nonces

```solidity
mapping(address => uint256) nonces
```

A record of states for signing / validating signatures

### DelegateChanged

```solidity
event DelegateChanged(address delegator, address fromDelegate, address toDelegate)
```

An event thats emitted when an account changes its delegate

### DelegateVotesChanged

```solidity
event DelegateVotesChanged(address delegate, euint64 previousBalance, euint64 newBalance)
```

An event thats emitted when a delegate account's vote balance changes

### constructor

```solidity
constructor() public
```

Construct a new Comp token

### setAllowedContract

```solidity
function setAllowedContract(address contractAddress) public
```

Set allowed contract that can access votes

#### Parameters

| Name            | Type    | Description                                              |
| --------------- | ------- | -------------------------------------------------------- |
| contractAddress | address | The address of the smart contract which may access votes |

### \_moveDelegates

```solidity
function _moveDelegates(address srcRep, address dstRep, euint64 amount) internal
```

### \_writeCheckpoint

```solidity
function _writeCheckpoint(address delegatee, uint32 nCheckpoints, euint64 oldVotes, euint64 newVotes) internal
```

### delegate

```solidity
function delegate(address delegatee) public
```

Delegate votes from `msg.sender` to `delegatee`

#### Parameters

| Name      | Type    | Description                      |
| --------- | ------- | -------------------------------- |
| delegatee | address | The address to delegate votes to |

### delegateBySig

```solidity
function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) public
```

Delegates votes from signatory to `delegatee`

#### Parameters

| Name      | Type    | Description                                        |
| --------- | ------- | -------------------------------------------------- |
| delegatee | address | The address to delegate votes to                   |
| nonce     | uint256 | The contract state required to match the signature |
| expiry    | uint256 | The time at which to expire the signature          |
| v         | uint8   | The recovery byte of the signature                 |
| r         | bytes32 | Half of the ECDSA signature pair                   |
| s         | bytes32 | Half of the ECDSA signature pair                   |

### getCurrentVotes

```solidity
function getCurrentVotes(address account) external view returns (euint64)
```

Gets the current votes balance for `account`

#### Parameters

| Name    | Type    | Description                      |
| ------- | ------- | -------------------------------- |
| account | address | The address to get votes balance |

#### Return Values

| Name | Type    | Description                               |
| ---- | ------- | ----------------------------------------- |
| [0]  | euint64 | The number of current votes for `account` |

### getPriorVotes

```solidity
function getPriorVotes(address account, uint256 blockNumber) public view returns (euint64)
```

Determine the prior number of votes for an account as of a block number

_Block number must be a finalized block or else this function will revert to prevent misinformation._

#### Parameters

| Name        | Type    | Description                                 |
| ----------- | ------- | ------------------------------------------- |
| account     | address | The address of the account to check         |
| blockNumber | uint256 | The block number to get the vote balance at |

#### Return Values

| Name | Type    | Description                                               |
| ---- | ------- | --------------------------------------------------------- |
| [0]  | euint64 | The number of votes the account had as of the given block |

### \_delegate

```solidity
function _delegate(address delegator, address delegatee) internal
```

### safe32

```solidity
function safe32(uint256 n, string errorMessage) internal pure returns (uint32)
```

### getChainId

```solidity
function getChainId() internal view returns (uint256)
```

### onlyAllowedContract

```solidity
modifier onlyAllowedContract()
```
