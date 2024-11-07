// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

/**
 * @title       IComp
 * @dev         The GovernorAlphaZama relies on this interface.
 */
interface IComp {
    function getPriorVotesForGovernor(address account, uint256 blockNumber) external returns (euint64 votes);
}
