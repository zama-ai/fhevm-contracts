# Solidity API

## GovernorZama

### name

```solidity
string name
```

The name of this contract

### quorumVotes

```solidity
function quorumVotes() public pure returns (uint256)
```

The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed

### proposalThreshold

```solidity
function proposalThreshold() public pure returns (uint32)
```

The number of votes required in order for a voter to become a proposer

### proposalMaxOperations

```solidity
function proposalMaxOperations() public pure returns (uint32)
```

The maximum number of actions that can be included in a proposal

### votingDelay

```solidity
function votingDelay() public pure returns (uint32)
```

The delay before voting on a proposal may take place, once proposed

### votingPeriod

```solidity
function votingPeriod() public pure virtual returns (uint32)
```

The duration of voting on a proposal, in blocks

### timelock

```solidity
contract TimelockInterface timelock
```

The address of the Compound Protocol Timelock

### comp

```solidity
contract CompInterface comp
```

The address of the Compound governance token

### guardian

```solidity
address guardian
```

The address of the Governor Guardian

### proposalCount

```solidity
uint256 proposalCount
```

The total number of proposals

### Proposal

```solidity
struct Proposal {
  uint256 id;
  address proposer;
  uint256 eta;
  address[] targets;
  uint256[] values;
  string[] signatures;
  bytes[] calldatas;
  uint256 startBlock;
  uint256 endBlock;
  euint64 forVotes;
  euint64 againstVotes;
  bool canceled;
  bool executed;
  mapping(address => struct GovernorZama.Receipt) receipts;
}
```

### Receipt

Ballot receipt record for a voter

```solidity
struct Receipt {
  bool hasVoted;
  bool support;
  euint64 votes;
}
```

### ProposalState

Possible states that a proposal may be in

```solidity
enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed
}
```

### proposals

```solidity
mapping(uint256 => struct GovernorZama.Proposal) proposals
```

The official record of all proposals ever proposed

### latestProposalIds

```solidity
mapping(address => uint256) latestProposalIds
```

The latest proposal for each proposer

### DOMAIN_TYPEHASH

```solidity
bytes32 DOMAIN_TYPEHASH
```

The EIP-712 typehash for the contract's domain

### BALLOT_TYPEHASH

```solidity
bytes32 BALLOT_TYPEHASH
```

The EIP-712 typehash for the ballot struct used by the contract

### ProposalCreated

```solidity
event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)
```

An event emitted when a new proposal is created

### VoteCast

```solidity
event VoteCast(address voter, uint256 proposalId)
```

An event emitted when a vote has been cast on a proposal

### ProposalCanceled

```solidity
event ProposalCanceled(uint256 id)
```

An event emitted when a proposal has been canceled

### ProposalQueued

```solidity
event ProposalQueued(uint256 id, uint256 eta)
```

An event emitted when a proposal has been queued in the Timelock

### ProposalExecuted

```solidity
event ProposalExecuted(uint256 id)
```

An event emitted when a proposal has been executed in the Timelock

### constructor

```solidity
constructor(address timelock_, address comp_, address guardian_) public
```

### propose

```solidity
function propose(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 customVotingPeriod, string description) public returns (uint256)
```

### queue

```solidity
function queue(uint256 proposalId) public
```

### \_queueOrRevert

```solidity
function _queueOrRevert(address target, uint256 value, string signature, bytes data, uint256 eta) internal
```

### execute

```solidity
function execute(uint256 proposalId) public payable
```

### cancel

```solidity
function cancel(uint256 proposalId) public
```

### getActions

```solidity
function getActions(uint256 proposalId) public view returns (address[] targets, uint256[] values, string[] signatures, bytes[] calldatas)
```

### getReceipt

```solidity
function getReceipt(uint256 proposalId, address voter) public view returns (struct GovernorZama.Receipt)
```

### state

```solidity
function state(uint256 proposalId) public view returns (enum GovernorZama.ProposalState)
```

### castVote

```solidity
function castVote(uint256 proposalId, bytes support) public
```

### castVote

```solidity
function castVote(uint256 proposalId, ebool support) public
```

### castVoteBySig

```solidity
function castVoteBySig(uint256 proposalId, bytes support, uint8 v, bytes32 r, bytes32 s) public
```

### castVoteBySig

```solidity
function castVoteBySig(uint256 proposalId, ebool support, uint8 v, bytes32 r, bytes32 s) public
```

### \_castVote

```solidity
function _castVote(address voter, uint256 proposalId, ebool support) internal
```

### \_\_acceptAdmin

```solidity
function __acceptAdmin() public
```

### \_\_abdicate

```solidity
function __abdicate() public
```

### \_\_queueSetTimelockPendingAdmin

```solidity
function __queueSetTimelockPendingAdmin(address newPendingAdmin, uint256 eta) public
```

### \_\_executeSetTimelockPendingAdmin

```solidity
function __executeSetTimelockPendingAdmin(address newPendingAdmin, uint256 eta) public
```

### add256

```solidity
function add256(uint256 a, uint256 b) internal pure returns (uint256)
```

### sub256

```solidity
function sub256(uint256 a, uint256 b) internal pure returns (uint256)
```

### getChainId

```solidity
function getChainId() internal view returns (uint256)
```

## TimelockInterface

### delay

```solidity
function delay() external view returns (uint256)
```

### GRACE_PERIOD

```solidity
function GRACE_PERIOD() external view returns (uint256)
```

### acceptAdmin

```solidity
function acceptAdmin() external
```

### queuedTransactions

```solidity
function queuedTransactions(bytes32 hash) external view returns (bool)
```

### queueTransaction

```solidity
function queueTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external returns (bytes32)
```

### cancelTransaction

```solidity
function cancelTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external
```

### executeTransaction

```solidity
function executeTransaction(address target, uint256 value, string signature, bytes data, uint256 eta) external payable returns (bytes)
```

## CompInterface

### getPriorVotes

```solidity
function getPriorVotes(address account, uint256 blockNumber) external view returns (euint64)
```
