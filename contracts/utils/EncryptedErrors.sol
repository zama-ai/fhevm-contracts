// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

/**
 * @notice This abstract contract is used for error handling in the fhEVM.
 *         Error codes are encrypted in the constructor inside the `errorCodes` mapping.
 * @dev    `errorCodes[0]` should always refer to the `NO_ERROR` code, by default.
 */
abstract contract EncryptedErrors {
    /// @notice The total number of errors is equal to zero.
    error TotalNumberErrorsEqualToZero();

    /// @notice Total number of errors.
    uint8 private immutable _TOTAL_NUMBER_ERRORS;

    /// @notice Mapping of error codes.
    /// @dev    It does not use arrays they are more expensive than mappings.
    mapping(uint8 errorCode => euint8 encryptedErrorCode) internal _errorCodes;

    /**
     * @notice Sets the non-null value for `numErrors` corresponding to the total number of errors.
     * @param totalNumberErrors_ total number of different errors.
     * @dev `numErrors` must be non-null (`errorCodes[0]` corresponds to the `NO_ERROR` code).
     */
    constructor(uint8 totalNumberErrors_) {
        if (totalNumberErrors_ == 0) {
            revert TotalNumberErrorsEqualToZero();
        }

        for (uint8 i; i <= totalNumberErrors_; i++) {
            euint8 errorCode = TFHE.asEuint8(i);
            _errorCodes[i] = errorCode;
            TFHE.allowThis(errorCode);
        }

        _TOTAL_NUMBER_ERRORS = totalNumberErrors_;
    }

    /**
     * @notice Returns the total number of errors.
     * @return totalNumberErrors total number of errors.
     * @dev    It does not count `NO_ERROR` as one of the errors.
     */
    function getTotalNumberErrors() external view returns (uint8 totalNumberErrors) {
        return _TOTAL_NUMBER_ERRORS;
    }
}
