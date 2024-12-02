# GovernorAlphaZama

This is based on the GovernorAlpha.sol contract written by Compound Labs. see:
compound-finance/compound-protocol/blob/master/contracts/Governance/GovernorAlpha.sol This decentralized governance
system allows users to propose and vote on changes to the protocol. The contract is responsible for:

- Proposal: A new proposal is made to introduce a change.
- Voting: Users can vote on the proposal, either in favor or against it.
- Quorum: A minimum number of votes (quorum) must be reached for the proposal to pass.
- Execution: Once a proposal passes, it is executed and takes effect on the protocol.

## LengthAboveMaxOperations

```solidity
error LengthAboveMaxOperations()
```

Returned if proposal contains too many changes.

## LengthIsNull

```solidity
error LengthIsNull()
```

Returned if the array length is equal to 0.

## LengthsDoNotMatch

```solidity
error LengthsDoNotMatch()
```

Returned if array lengths are not equal.

## ProposalActionsAlreadyQueued

```solidity
error ProposalActionsAlreadyQueued()
```

Returned if proposal's actions have already been queued.

## ProposalStateInvalid

```solidity
error ProposalStateInvalid()
```

Returned if the proposal state is invalid for this operation.

_It is returned for any proposal state not matching the expected state to conduct the operation._

## ProposalStateNotActive

```solidity
error ProposalStateNotActive()
```

Returned if the proposal's state is active but `block.number` > `endBlock`.

## ProposalStateStillActive

```solidity
error ProposalStateStillActive()
```

Returned if the proposal state is still active.

## ProposerHasAnotherProposal

```solidity
error ProposerHasAnotherProposal()
```

Returned if the proposer has another proposal in progress.

## VoterHasAlreadyVoted

```solidity
error VoterHasAlreadyVoted()
```

Returned if the voter has already cast a vote for this proposal.

## ProposalActive

```solidity
event ProposalActive(uint256 id)
```

Emitted when a proposal is now active.

## ProposalCanceled

```solidity
event ProposalCanceled(uint256 id)
```

Emitted when a proposal has been canceled.

## ProposalCreated

```solidity
event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)
```

Emitted when a new proposal is created.

## ProposalDefeated

```solidity
event ProposalDefeated(uint256 id)
```

Emitted when a proposal is defeated either by lack of votes or by more votes against.

## ProposalExecuted

```solidity
event ProposalExecuted(uint256 id)
```

Emitted when a proposal has been executed in the Timelock.

## ProposalQueued

```solidity
event ProposalQueued(uint256 id, uint256 eta)
```

Emitted when a proposal has been queued in the Timelock.

## ProposalRejected

```solidity
event ProposalRejected(uint256 id)
```

Emitted when a proposal has been rejected since the number of votes is lower than the required threshold.

## ProposalSucceeded

```solidity
event ProposalSucceeded(uint256 id)
```

Emitted when a proposal has been rejected since the number of votes is lower than the required threshold.

## VoteCast

```solidity
event VoteCast(address voter, uint256 proposalId)
```

Emitted when a vote has been cast on a proposal.

## ProposalState

Possible states that a proposal may be in.

### Parameters

| Name                         | Description                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Pending                      | Proposal does not exist.                                                                    |
| PendingThresholdVerification | Proposal is created but token threshold verification is pending.                            |
| Rejected                     | Proposal was rejected as the proposer did not meet the token threshold.                     |
| Active                       | Proposal is active and voters can cast their votes.                                         |
| PendingResults               | Proposal is not active and the result decryption is in progress.                            |
| Canceled                     | Proposal has been canceled by the proposer or by this contract's owner.                     |
| Defeated                     | Proposal has been defeated (either not reaching the quorum or `againstVotes` > `forVotes`). |
| Succeeded                    | Proposal has succeeded (`forVotes` > `againstVotes`).                                       |
| Queued                       | Proposal has been queued in the `Timelock`.                                                 |
| Expired                      | Proposal has expired (@dev This state exists only in read-only functions).                  |
| Executed                     | Proposal has been executed in the `Timelock`.                                               |

```solidity
enum ProposalState {
  Pending,
  PendingThresholdVerification,
  Rejected,
  Active,
  PendingResults,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed
}
```

## Proposal

### Parameters

| Name                  | Type                            | Description                                                                                                      |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| proposer              | address                         | Proposal creator.                                                                                                |
| state                 | GovernorAlphaZama.ProposalState | State of the proposal.                                                                                           |
| eta                   | uint256                         | The timestamp that the proposal will be available for execution, it is set automatically once the vote succeeds. |
| targets               | address[]                       | The ordered list of target addresses for calls to be made.                                                       |
| values                | uint256[]                       | The ordered list of values (i.e. `msg.value`) to be passed to the calls to be made.                              |
| signatures            | string[]                        | The ordered list of function signatures to be called.                                                            |
| calldatas             | calldatas                       | The ordered list of calldata to be passed to each call.                                                          |
| startBlock            | startBlock                      | The block at which voting begins: holders must delegate their votes prior to this block.                         |
| endBlock              | endBlock                        | The block at which voting ends: votes must be cast prior to this block. -----------                              |
| forVotes              | forVotes                        | Current encrypted number of votes for to this proposal.-----------                                               |
| againstVotes          | againstVotes                    | Current encrypted number of votes in opposition to this proposal.-----------                                     |
| forVotesDecrypted     | forVotesDecrypted               | For votes once decrypted by the gateway.-----------                                                              |
| againstVotesDecrypted | againstVotesDecrypted           | Against votes once decrypted by the gateway.-----------                                                          |

```solidity
struct Proposal {
  address proposer;
  enum GovernorAlphaZama.ProposalState state;
  uint256 eta;
  address[] targets;
  uint256[] values;
  string[] signatures;
  bytes[] calldatas;
  uint256 startBlock;
  uint256 endBlock;
  euint64 forVotes;
  euint64 againstVotes;
  uint64 forVotesDecrypted;
  uint64 againstVotesDecrypted;
}
```

## ProposalInfo

### Parameters

| Name         | Type                            | Description                                                                                                      |
| ------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| proposer     | address                         | Proposal creator.                                                                                                |
| state        | GovernorAlphaZama.ProposalState | State of the proposal.                                                                                           |
| eta          | uint256                         | The timestamp that the proposal will be available for execution, it is set automatically once the vote succeeds. |
| targets      | address[]                       | The ordered list of target addresses for calls to be made.                                                       |
| values       | uint256[]                       | The ordered list of values (i.e. `msg.value`) to be passed to the calls to be made.                              |
| signatures   | string[]                        | The ordered list of function signatures to be called.                                                            |
| calldatas    | calldatas                       | The ordered list of calldata to be passed to each call.                                                          |
| startBlock   | startBlock                      | The block at which voting begins: holders must delegate their votes prior to this block.                         |
| endBlock     | endBlock                        | The block at which voting ends: votes must be cast prior to this block. -----------                              |
| forVotes     | forVotesDecrypted               | For votes once decrypted by the gateway.-----------                                                              |
| againstVotes | againstVotesDecrypted           | Against votes once decrypted by the gateway.-----------                                                          |

```solidity
struct ProposalInfo {
  address proposer;
  enum GovernorAlphaZama.ProposalState state;
  uint256 eta;
  address[] targets;
  uint256[] values;
  string[] signatures;
  bytes[] calldatas;
  uint256 startBlock;
  uint256 endBlock;
  uint64 forVotes;
  uint64 againstVotes;
}
```

## Receipt

Ballot receipt record for a voter.

### Parameters

| Name     | Type    | Description                                     |
| -------- | ------- | ----------------------------------------------- |
| hasVoted | bool    | Whether or not a vote has been cast.            |
| support  | ebool   | Whether or not the voter supports the proposal. |
| support  | euint64 | The number of votes cast by the voter.          |

```solidity
struct Receipt {
  bool hasVoted;
  ebool support;
  euint64 votes;
}
```

## PROPOSAL_MAX_OPERATIONS

```solidity
uint256 PROPOSAL_MAX_OPERATIONS
```

The maximum number of actions that can be included in a proposal.

_It is 10 actions per proposal._

## PROPOSAL_THRESHOLD

```solidity
uint256 PROPOSAL_THRESHOLD
```

The number of votes required for a voter to become a proposer.

_It is set at 100,000, which is 1% of the total supply of the ConfidentialERC20Votes token._

## QUORUM_VOTES

```solidity
uint64 QUORUM_VOTES
```

The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed.

_It is set at 400,000, which is 4% of the total supply of the ConfidentialERC20Votes token._

## VOTING_DELAY

```solidity
uint256 VOTING_DELAY
```

The delay before voting on a proposal may take place once proposed. It is 1 block.

## VOTING_PERIOD

```solidity
uint256 VOTING_PERIOD
```

The duration of voting on a proposal, in blocks

_It is recommended to be set at 3 days in blocks (i.e 21,600 for 12-second blocks)._

## CONFIDENTIAL_ERC20_VOTES

```solidity
contract IConfidentialERC20Votes CONFIDENTIAL_ERC20_VOTES
```

ConfidentialERC20Votes governance token.

## TIMELOCK

```solidity
contract ICompoundTimelock TIMELOCK
```

Compound Timelock.

## proposalCount

```solidity
uint256 proposalCount
```

The total number of proposals made. It includes all proposals, including the ones that were rejected/canceled/defeated.

## latestProposalIds

```solidity
mapping(address => uint256) latestProposalIds
```

The latest proposal for each proposer.

## \_accountReceiptForProposalId

```solidity
mapping(uint256 => mapping(address => struct GovernorAlphaZama.Receipt)) _accountReceiptForProposalId
```

Ballot receipt for an account for a proposal id.

## \_proposals

```solidity
mapping(uint256 => struct GovernorAlphaZama.Proposal) _proposals
```

The official record of all proposals that have been created.

## \_requestIdToProposalId

```solidity
mapping(uint256 => uint256) _requestIdToProposalId
```

Returns the proposal id associated with the request id from the Gateway.

_This mapping is used for decryption._

## constructor

```solidity
constructor(address owner_, address timelock_, address comp_, uint256 votingPeriod_) internal
```

_Do not use a small value in production such as 5 or 20 to avoid security issues unless for testing purpose. It should
by at least a few days,. For instance, 3 days would have a votingPeriod = 21,600 blocks if 12s per block._

### Parameters

| Name                     | Type    | Description                   |
| ------------------------ | ------- | ----------------------------- |
| owner\_                  | address | Owner address.                |
| timelock\_               | address | Timelock contract.            |
| confidentialERC20Votes\_ | address | ConfidentialERC20Votes token. |
| votingPeriod\_           | uint256 | Voting period.                |

## cancel

```solidity
function cancel(uint256 proposalId) public virtual
```

Cancel the proposal.

_Only this contract's owner or the proposer can cancel. In the original GovernorAlpha, the proposer can cancel only if
her votes are still above the threshold._

### Parameters

| Name       | Type    | Description  |
| ---------- | ------- | ------------ |
| proposalId | uint256 | Proposal id. |

## castVote

```solidity
function castVote(uint256 proposalId, einput value, bytes inputProof) public virtual
```

Cast a vote.

### Parameters

| Name       | Type    | Description      |
| ---------- | ------- | ---------------- |
| proposalId | uint256 | Proposal id.     |
| value      | einput  | Encrypted value. |
| inputProof | bytes   | Input proof.     |

## castVote

```solidity
function castVote(uint256 proposalId, ebool support) public virtual
```

Cast a vote.

### Parameters

| Name       | Type    | Description                                             |
| ---------- | ------- | ------------------------------------------------------- |
| proposalId | uint256 | Proposal id.                                            |
| support    | ebool   | Support (true ==> `forVotes`, false ==> `againstVotes`) |

## execute

```solidity
function execute(uint256 proposalId) public payable virtual
```

Execute the proposal id.

_Anyone can execute a proposal once it has been queued and the delay in the timelock is sufficient._

## propose

```solidity
function propose(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description) public virtual returns (uint256 proposalId)
```

Start a new proposal.

### Parameters

| Name        | Type      | Description                             |
| ----------- | --------- | --------------------------------------- |
| targets     | address[] | Target addresses.                       |
| values      | uint256[] | Values.                                 |
| signatures  | string[]  | Signatures.                             |
| calldatas   | bytes[]   | Calldatas.                              |
| description | string    | Plain text description of the proposal. |

### Return Values

| Name       | Type    | Description  |
| ---------- | ------- | ------------ |
| proposalId | uint256 | Proposal id. |

## queue

```solidity
function queue(uint256 proposalId) public virtual
```

Queue a new proposal.

_It can be done only if the proposal has succeeded. Anyone can queue a proposal._

### Parameters

| Name       | Type    | Description  |
| ---------- | ------- | ------------ |
| proposalId | uint256 | Proposal id. |

## requestVoteDecryption

```solidity
function requestVoteDecryption(uint256 proposalId) public virtual
```

Request the vote results to be decrypted.

_Anyone can request the decryption of the vote._

### Parameters

| Name       | Type    | Description  |
| ---------- | ------- | ------------ |
| proposalId | uint256 | Proposal id. |

## callbackInitiateProposal

```solidity
function callbackInitiateProposal(uint256 requestId, bool canInitiate) public virtual
```

_Only callable by the gateway._

### Parameters

| Name        | Type    | Description                            |
| ----------- | ------- | -------------------------------------- |
| requestId   | uint256 | Request id (from the Gateway)          |
| canInitiate | bool    | Whether the proposal can be initiated. |

## callbackVoteDecryption

```solidity
function callbackVoteDecryption(uint256 requestId, uint256 forVotesDecrypted, uint256 againstVotesDecrypted) public virtual
```

_Only callable by the gateway. If `forVotesDecrypted` == `againstVotesDecrypted`, proposal is defeated._

### Parameters

| Name                  | Type    | Description    |
| --------------------- | ------- | -------------- |
| requestId             | uint256 |                |
| forVotesDecrypted     | uint256 | For votes.     |
| againstVotesDecrypted | uint256 | Against votes. |

## acceptTimelockAdmin

```solidity
function acceptTimelockAdmin() public virtual
```

_Only callable by `owner`._

## executeSetTimelockPendingAdmin

```solidity
function executeSetTimelockPendingAdmin(address newPendingAdmin, uint256 eta) public virtual
```

_Only callable by `owner`._

### Parameters

| Name            | Type    | Description                                        |
| --------------- | ------- | -------------------------------------------------- |
| newPendingAdmin | address | Address of the new pending admin for the timelock. |
| eta             | uint256 | Eta for executing the transaction in the timelock. |

## queueSetTimelockPendingAdmin

```solidity
function queueSetTimelockPendingAdmin(address newPendingAdmin, uint256 eta) public virtual
```

_Only callable by `owner`._

### Parameters

| Name            | Type    | Description                                        |
| --------------- | ------- | -------------------------------------------------- |
| newPendingAdmin | address | Address of the new pending admin for the timelock. |
| eta             | uint256 | Eta for queuing the transaction in the timelock.   |

## getProposalInfo

```solidity
function getProposalInfo(uint256 proposalId) public view virtual returns (struct GovernorAlphaZama.ProposalInfo proposalInfo)
```

Returns proposal information for a proposal id.

_It returns decrypted `forVotes`/`againstVotes`. These are only available after the decryption._

### Parameters

| Name       | Type    | Description  |
| ---------- | ------- | ------------ |
| proposalId | uint256 | Proposal id. |

### Return Values

| Name         | Type                                  | Description           |
| ------------ | ------------------------------------- | --------------------- |
| proposalInfo | struct GovernorAlphaZama.ProposalInfo | Proposal information. |

## getReceipt

```solidity
function getReceipt(uint256 proposalId, address account) public view virtual returns (bool, ebool, euint64)
```

Returns the vote receipt information for the account for a proposal id.

### Parameters

| Name       | Type    | Description      |
| ---------- | ------- | ---------------- |
| proposalId | uint256 | Proposal id.     |
| account    | address | Account address. |

### Return Values

| Name | Type    | Description                                                                      |
| ---- | ------- | -------------------------------------------------------------------------------- |
| [0]  | bool    | hasVoted Whether the account has voted.                                          |
| [1]  | ebool   | support The support for the account (true ==> vote for, false ==> vote against). |
| [2]  | euint64 | votes The number of votes cast.                                                  |

## \_castVote

```solidity
function _castVote(address voter, uint256 proposalId, ebool support) internal virtual
```

## \_queueOrRevert

```solidity
function _queueOrRevert(address target, uint256 value, string signature, bytes data, uint256 eta) internal virtual
```
