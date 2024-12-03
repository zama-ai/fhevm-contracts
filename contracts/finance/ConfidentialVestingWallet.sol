// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

import { IConfidentialERC20 } from "../token/ERC20/IConfidentialERC20.sol";

import "hardhat/console.sol";

/**
 * @title  ConfidentialVestingWallet
 * @notice This contract offers a simple vesting wallet for ConfidentialERC20 tokens.
 *         This is based on the VestingWallet.sol contract written by OpenZeppelin.
 *         see: openzeppelin/openzeppelin-contracts/blob/master/contracts/finance/VestingWallet.sol
 * @dev    Default implementation is a linear vesting curve.
 *         To use with the native asset, it is necessary to wrap the native asset to a ConfidentialERC20-like token.
 */
abstract contract ConfidentialVestingWallet {
    /// @notice Emitted when tokens are released to the beneficiary address.
    event ConfidentialERC20Released();

    /// @notice Beneficiary address.
    address public immutable BENEFICIARY;

    /// @notice Confidential ERC20.
    IConfidentialERC20 public immutable CONFIDENTIAL_ERC20;

    /// @notice Duration (in seconds).
    uint64 public immutable DURATION;

    /// @notice End timestamp.
    uint64 public immutable END_TIMESTAMP;

    /// @notice Start timestamp.
    uint64 public immutable START_TIMESTAMP;

    /// @notice Constant for zero using TFHE.
    /// @dev    Since it is expensive to compute 0, it is stored instead.
    ///         However, is not possible to define it as constant due to TFHE constraints.
    /* solhint-disable var-name-mixedcase*/
    euint64 internal _EUINT64_ZERO;

    /// @notice Total encrypted amount released (to the beneficiary).
    euint64 internal _amountReleased;

    /**
     * @param beneficiary_      Beneficiary address.
     * @param token_            Confidential token address.
     * @param startTimestamp_   Start timestamp.
     * @param duration_         Duration (in seconds).
     */
    constructor(address beneficiary_, address token_, uint64 startTimestamp_, uint64 duration_) {
        START_TIMESTAMP = startTimestamp_;
        CONFIDENTIAL_ERC20 = IConfidentialERC20(token_);
        DURATION = duration_;
        END_TIMESTAMP = startTimestamp_ + duration_;
        BENEFICIARY = beneficiary_;

        /// @dev Store this constant-like variable in the storage.
        _EUINT64_ZERO = TFHE.asEuint64(0);
        _amountReleased = _EUINT64_ZERO;

        TFHE.allow(_EUINT64_ZERO, beneficiary_);
        TFHE.allowThis(_EUINT64_ZERO);
    }

    /**
     * @notice  Release the tokens that have already vested.
     * @dev     Anyone can call this function but the beneficiary receives the tokens.
     */
    function release() public virtual {
        euint64 amount = _releasable();

        euint64 amountReleased = TFHE.add(_amountReleased, amount);
        _amountReleased = amountReleased;
        TFHE.allow(amountReleased, BENEFICIARY);
        TFHE.allowThis(amountReleased);

        TFHE.allowTransient(amount, address(CONFIDENTIAL_ERC20));
        CONFIDENTIAL_ERC20.transfer(BENEFICIARY, amount);

        emit ConfidentialERC20Released();
    }

    /**
     * @notice                  Return the encrypted amount of total tokens released.
     * @dev                     It is only reencryptable by the owner.
     * @return amountReleased   Total amount of tokens released.
     */
    function released() public view virtual returns (euint64 amountReleased) {
        return _amountReleased;
    }

    /**
     * @notice                  Calculate the amount of tokens that can be released.
     * @return releasableAmount Releasable amount.
     */
    function _releasable() internal virtual returns (euint64 releasableAmount) {
        return TFHE.sub(_vestedAmount(uint64(block.timestamp)), released());
    }

    /**
     * @notice                  Calculate the amount of tokens that has already vested.
     * @return vestedAmount     Vested amount.
     */
    function _vestedAmount(uint64 timestamp) internal virtual returns (euint64 vestedAmount) {
        return _vestingSchedule(TFHE.add(CONFIDENTIAL_ERC20.balanceOf(address(this)), released()), timestamp);
    }

    /**
     * @notice                  Return the vested amount based on a linear vesting schedule.
     * @dev                     It must be overriden for non-linear schedules.
     * @param totalAllocation   Total allocation that is vested.
     * @param timestamp         Current timestamp.
     * @return vestedAmount     Vested amount.
     */
    function _vestingSchedule(
        euint64 totalAllocation,
        uint64 timestamp
    ) internal virtual returns (euint64 vestedAmount) {
        if (timestamp < START_TIMESTAMP) {
            return _EUINT64_ZERO;
        } else if (timestamp >= END_TIMESTAMP) {
            return totalAllocation;
        } else {
            return TFHE.div(TFHE.mul(totalAllocation, (timestamp - START_TIMESTAMP)), DURATION);
        }
    }
}
