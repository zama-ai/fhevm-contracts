// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

import { ConfidentialVestingWallet } from "./ConfidentialVestingWallet.sol";

/**
 * @title  ConfidentialVestingWalletCliff
 * @notice This contract offers a simple vesting wallet with a cliff for ConfidentialERC20 tokens.
 *         This is based on the VestingWalletCliff.sol contract written by OpenZeppelin.
 *         see: openzeppelin/openzeppelin-contracts/blob/master/contracts/finance/VestingWalletCliff.sol
 * @dev    This implementation is a linear vesting curve with a cliff.
 *         To use with the native asset, it is necessary to wrap the native asset to a ConfidentialERC20-like token.
 */

abstract contract VestingWalletCliff is ConfidentialVestingWallet {
    /// @notice Returned if the cliff duration is greater than the vesting duration.
    error InvalidCliffDuration(uint64 cliffSeconds, uint64 durationSeconds);

    /// @notice Cliff duration (in seconds).
    uint64 public immutable CLIFF;

    /**
     * @param beneficiary_      Beneficiary address.
     * @param token_            Confidential token address.
     * @param startTimestamp_   Start timestamp.
     * @param duration_         Duration (in seconds).
     * @param cliff_            Cliff (in seconds).
     */
    constructor(
        address beneficiary_,
        address token_,
        uint64 startTimestamp_,
        uint64 duration_,
        uint64 cliff_
    ) ConfidentialVestingWallet(beneficiary_, token_, startTimestamp_, duration_) {
        if (cliff_ > duration_) {
            revert InvalidCliffDuration(cliff_, duration_);
        }

        CLIFF = startTimestamp_ + cliff_;
    }

    /**
     * @notice                  Return the vested amount based on a linear vesting schedule with a cliff.
     * @param totalAllocation   Total allocation that is vested.
     * @param timestamp         Current timestamp.
     * @return vestedAmount     Vested amount.
     */
    function _vestingSchedule(euint64 totalAllocation, uint64 timestamp) internal virtual override returns (euint64) {
        return timestamp < CLIFF ? _EUINT64_ZERO : super._vestingSchedule(totalAllocation, timestamp);
    }
}
