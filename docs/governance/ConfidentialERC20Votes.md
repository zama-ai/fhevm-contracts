# ConfidentialERC20Votes

This contract inherits [ConfidentialERC20](../token/ERC20/ConfidentialERC20.md), EIP712, and Ownable2Step. This is based
on the
[Comp.sol contract written by Compound Labs](https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/Comp.sol).
It is a governance token used to delegate votes, which can be used by contracts such as ConfidentialGovernorAlpha. It
uses encrypted votes to delegate the voting power associated with an account's balance.

_The delegation of votes leaks information about the account's encrypted balance to the `delegatee`._

### BlockNumberEqualOrHigherThanCurrentBlock

```solidity
error BlockNumberEqualOrHigherThanCurrentBlock()
```

Returned if the `blockNumber` is higher or equal to the (current) `block.number`.

_It is returned in requests to access votes._

### GovernorInvalid

```solidity
error GovernorInvalid()
```

Returned if the `msg.sender` is not the `governor` contract.

### SignatureExpired

```solidity
error SignatureExpired()
```

Returned if the signature has expired.

### SignatureNonceInvalid

```solidity
error SignatureNonceInvalid()
```

Returned if the signature's nonce is invalid.

### SignatureVerificationFail

```solidity
error SignatureVerificationFail()
```

Returned if the signature's verification has failed.

_See {SignatureChecker} for potential reasons._

### DelegateChanged

```solidity
event DelegateChanged(address delegator, address fromDelegate, address toDelegate)
```

Emitted when an `account` (i.e. `delegator`) changes its delegate.

### NewGovernor

```solidity
event NewGovernor(address governor)
```

Emitted when the governor contract that can reencrypt votes changes.

_WARNING: it can be set to a malicious contract, which could reencrypt all user votes._

### NonceIncremented

```solidity
event NonceIncremented(address account, uint256 newNonce)
```

Emitted when the account cancels a signature.

### Checkpoint

A checkpoint for marking number of votes from a given block.

_In Compound's implementation, `fromBlock` is defined as uint32 to allow tight-packing. However, in this implementations
`votes` is uint256-based. `fromBlock`'s type is set to uint256, which simplifies the codebase._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Checkpoint {
  uint256 fromBlock;
  euint64 votes;
}
```

### DELEGATION_TYPEHASH

```solidity
bytes32 DELEGATION_TYPEHASH
```

The EIP-712 typehash for the `Delegation` struct.

### governor

```solidity
address governor
```

The smart contract that can access encrypted votes.

_The contract is expected to be a governor contract._

### delegates

```solidity
mapping(address => address) delegates
```

A record of each account's `delegate`.

### nonces

```solidity
mapping(address => uint256) nonces
```

A record of states for signing/validating signatures.

### numCheckpoints

```solidity
mapping(address => uint32) numCheckpoints
```

The number of checkpoints for an `account`.

### \_checkpoints

```solidity
mapping(address => mapping(uint32 => struct ConfidentialERC20Votes.Checkpoint)) _checkpoints
```

A record of votes \_checkpoints for an `account` using incremental indices.

### constructor

```solidity
constructor(address owner_, string name_, string symbol_, string version_, uint64 totalSupply_) internal
```

#### Parameters

| Name          | Type    | Description                  |
| ------------- | ------- | ---------------------------- |
| owner\_       | address | Owner address.               |
| name\_        | string  | Token name.                  |
| symbol\_      | string  | Token symbol.                |
| version\_     | string  | Version (e.g. "0.1", "1.0"). |
| totalSupply\_ | uint64  | Total supply to mint.        |

### delegate

```solidity
function delegate(address delegatee) public virtual
```

Delegate votes from `msg.sender` to `delegatee`.

#### Parameters

| Name      | Type    | Description                       |
| --------- | ------- | --------------------------------- |
| delegatee | address | The address to delegate votes to. |

### delegateBySig

```solidity
function delegateBySig(address delegator, address delegatee, uint256 nonce, uint256 expiry, bytes signature) public virtual
```

Delegate votes from signatory to `delegatee`.

_Signature can be either 64-byte or 65-byte long if it is from an EOA. Else, it must adhere to ERC1271. See
{https://eips.ethereum.org/EIPS/eip-1271}_

#### Parameters

| Name      | Type    | Description                                                  |
| --------- | ------- | ------------------------------------------------------------ |
| delegator | address | The account that delegates its votes. It must be the signer. |
| delegatee | address | The address to delegate votes to.                            |
| nonce     | uint256 | The contract state required to match the signature.          |
| expiry    | uint256 | The time at which to expire the signature.                   |
| signature | bytes   | The signature.                                               |

### incrementNonce

```solidity
function incrementNonce() public virtual
```

Increment the nonce.

_This function enables the sender to cancel a signature._

### getPriorVotesForGovernor

```solidity
function getPriorVotesForGovernor(address account, uint256 blockNumber) public virtual returns (euint64 votes)
```

See {IConfidentialERC20Votes-getPriorVotesForGovernor}.

### getCurrentVotes

```solidity
function getCurrentVotes(address account) public view virtual returns (euint64 votes)
```

Get current votes of account.

#### Parameters

| Name    | Type    | Description     |
| ------- | ------- | --------------- |
| account | address | Account address |

#### Return Values

| Name  | Type    | Description                |
| ----- | ------- | -------------------------- |
| votes | euint64 | Current (encrypted) votes. |

### getPriorVotes

```solidity
function getPriorVotes(address account, uint256 blockNumber) public view virtual returns (euint64 votes)
```

Get the prior number of votes for an account as of a block number.

_Block number must be a finalized block or else this function will revert._

#### Parameters

| Name        | Type    | Description                                  |
| ----------- | ------- | -------------------------------------------- |
| account     | address | Account address.                             |
| blockNumber | uint256 | The block number to get the vote balance at. |

#### Return Values

| Name  | Type    | Description                                        |
| ----- | ------- | -------------------------------------------------- |
| votes | euint64 | Number of votes the account as of the given block. |

### setGovernor

```solidity
function setGovernor(address newGovernor) public virtual
```

Set a governor contract.

#### Parameters

| Name        | Type    | Description                                            |
| ----------- | ------- | ------------------------------------------------------ |
| newGovernor | address | New governor contract that can reencrypt/access votes. |

### \_delegate

```solidity
function _delegate(address delegator, address delegatee) internal virtual
```

### \_getPriorVote

```solidity
function _getPriorVote(address account, uint256 blockNumber) internal view virtual returns (euint64 votes)
```

### \_moveDelegates

```solidity
function _moveDelegates(address srcRep, address dstRep, euint64 amount) internal virtual
```

### \_transfer

```solidity
function _transfer(address from, address to, euint64 amount, ebool isTransferable) internal virtual
```

_Original restrictions to transfer from/to address(0) are removed since they are inherited._

### \_writeCheckpoint

```solidity
function _writeCheckpoint(address delegatee, uint32 nCheckpoints, euint64 newVotes) internal virtual
```
