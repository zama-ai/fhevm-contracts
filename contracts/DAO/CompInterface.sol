// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

interface CompInterface {
    function getPriorVotes(address account, uint256 blockNumber) external view returns (euint64 votes);
}
