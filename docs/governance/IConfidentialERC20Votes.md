## IConfidentialERC20Votes

_Governor contracts use this interface to build a logic using votes._

### getPriorVotesForGovernor

```solidity
function getPriorVotesForGovernor(address account, uint256 blockNumber) external returns (euint64 votes)
```

Determine the prior number of votes for an account as of a block number.

_Block number must be a finalized block or else this function will revert. This function can change the state since the
governor needs access in the ACL contract._

#### Parameters

| Name        | Type    | Description                                  |
| ----------- | ------- | -------------------------------------------- |
| account     | address | Account address.                             |
| blockNumber | uint256 | The block number to get the vote balance at. |

#### Return Values

| Name  | Type    | Description                                               |
| ----- | ------- | --------------------------------------------------------- |
| votes | euint64 | Number of votes the account as of the given block number. |
