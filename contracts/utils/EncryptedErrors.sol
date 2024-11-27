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
    error TotalNumberErrorCodesEqualToZero();

    /// @notice Error index is invalid.
    error ErrorIndexInvalid();

    /// @notice Error index is null.
    error ErrorIndexIsNull();

    /// @notice Total number of error codes.
    /// @dev Should hold the constant size of the _errorCodesDefinitions mapping
    uint8 private immutable _TOTAL_NUMBER_ERROR_CODES;

    /// @notice Mapping of trivially encrypted error codes definitions.
    /// @dev In storage because solc does not support immutable mapping, neither immutable arrays, yet
    mapping(uint8 errorCode => euint8 encryptedErrorCode) private _errorCodesDefinitions;

    /// @notice Mapping of encrypted error codes emitted.
    mapping(uint256 errorIndex => euint8 encryptedErrorCode) private _errorCodesEmitted;

    /// @notice Used to keep track of number of emitted errors
    /// @dev Should hold the size of the _errorCodesEmitted mapping
    uint256 private _errorCounter;

    /**
     * @notice Sets the non-null value for `_TOTAL_NUMBER_ERROR_CODES` corresponding to the total number of errors.
     * @param totalNumberErrorCodes_ total number of different errors.
     * @dev `totalNumberErrorCodes_` must be non-null (`_errorCodesDefinitions[0]` corresponds to the `NO_ERROR` code).
     */
    constructor(uint8 totalNumberErrorCodes_) {
        if (totalNumberErrorCodes_ == 0) {
            revert TotalNumberErrorCodesEqualToZero();
        }
        for (uint8 i; i <= totalNumberErrorCodes_; i++) {
            euint8 errorCode = TFHE.asEuint8(i);
            _errorCodesDefinitions[i] = errorCode;
            TFHE.allowThis(errorCode);
        }
        _TOTAL_NUMBER_ERROR_CODES = totalNumberErrorCodes_;
    }

    /**
     * @notice Returns the trivially encrypted error code at index `indexCodeDefinition`.
     * @param indexCodeDefinition the index of the requested error code definition.
     * @return the trivially encrypted error code located at `indexCodeDefinition` of _errorCodesDefinitions mapping.
     */
    function getErrorCodeDefinition(uint8 indexCodeDefinition) internal view returns (euint8) {
        if (indexCodeDefinition >= _TOTAL_NUMBER_ERROR_CODES) revert ErrorIndexInvalid();
        return _errorCodesDefinitions[indexCodeDefinition];
    }

    /**
     * @notice Returns the total counter of emitted of error codes.
     * @return the number of errors emitted.
     */
    function getErrorCounter() internal view returns (uint256) {
        return _errorCounter;
    }

    /**
     * @notice Returns the total number of the possible error codes defined.
     * @return the total number of the different possible error codes.
     */
    function getNumErrorCodesDefined() internal view returns (uint8) {
        return _TOTAL_NUMBER_ERROR_CODES;
    }

    /**
     * @notice Returns the encrypted error code which was stored in the `_errorCodesEmitted` mapping at key `errorId`.
     * @param errorId the requested key stored in the `_errorCodesEmitted` mapping.
     * @return the encrypted error code located at the `errorId` key.
     * @dev `errorId` must be a valid id, i.e below the error counter.
     */
    function getErrorCodeEmitted(uint256 errorId) internal view returns (euint8) {
        if (errorId >= _errorCounter) revert ErrorIndexInvalid();
        return _errorCodesEmitted[errorId];
    }

    /**
     * @notice Computes an encrypted error code, result will be either a reencryption of
     * `_errorCodesDefinitions[indexCode]` if `condition` is an encrypted `true` or of `NO_ERROR` otherwise.
     * @param condition the encrypted boolean used in the select operator.
     * @param indexCode the index of the selected error code if `condition` encrypts `true`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be non-null and below the total number of defined error codes.
     */
    function defineErrorIf(ebool condition, uint8 indexCode) internal returns (euint8) {
        if (indexCode == 0) revert ErrorIndexIsNull();
        if (indexCode > _TOTAL_NUMBER_ERROR_CODES) revert ErrorIndexInvalid();
        euint8 errorCode = TFHE.select(condition, _errorCodesDefinitions[indexCode], _errorCodesDefinitions[0]);
        return errorCode;
    }

    /**
     * @notice Does the opposite of `defineErrorIf`, i.e result will be either a reencryption of
     * `_errorCodesDefinitions[indexCode]` if `condition` is an encrypted `false` or of `NO_ERROR` otherwise.
     * @param condition the encrypted boolean used in the select operator.
     * @param indexCode the index of the selected error code if `condition` encrypts `false`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be non-null and below the total number of defined error codes.
     */
    function defineErrorIfNot(ebool condition, uint8 indexCode) internal returns (euint8) {
        if (indexCode == 0) revert ErrorIndexIsNull();
        if (indexCode > _TOTAL_NUMBER_ERROR_CODES) revert ErrorIndexInvalid();
        euint8 errorCode = TFHE.select(condition, _errorCodesDefinitions[0], _errorCodesDefinitions[indexCode]);
        return errorCode;
    }

    /**
     * @notice Computes an encrypted error code, result will be either a reencryption of
     * `_errorCodesDefinitions[indexCode]` if `condition` is an encrypted `true` or of `errorCode` otherwise.
     * @param condition the encrypted boolean used in the select operator.
     * @param errorCode the selected error code if `condition` encrypts `true`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be below the total number of error codes.
     */
    function changeErrorIf(ebool condition, uint8 indexCode, euint8 errorCode) internal returns (euint8) {
        if (indexCode >= _TOTAL_NUMBER_ERROR_CODES) revert ErrorIndexInvalid();
        return TFHE.select(condition, _errorCodesDefinitions[indexCode], errorCode);
    }

    /**
     * @notice Does the opposite of `changeErrorIf`, i.e result will be either a reencryption of
     * `_errorCodesDefinitions[indexCode]` if `condition` is an encrypted `false` or of `errorCode` otherwise.
     * @param condition the encrypted boolean used in the cmux.
     * @param errorCode the selected error code if `condition` encrypts `false`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be below the total number of error codes.
     */
    function changeErrorIfNot(ebool condition, uint8 indexCode, euint8 errorCode) internal returns (euint8) {
        if (indexCode >= _TOTAL_NUMBER_ERROR_CODES) revert ErrorIndexInvalid();
        return TFHE.select(condition, errorCode, _errorCodesDefinitions[indexCode]);
    }

    /**
     * @notice Saves `errorCode` in storage, in the `_errorCodesEmitted` mapping, at the lowest unused key.
     * @param errorCode the encrypted error code to be saved in storage.
     * @return the `errorId` key in `_errorCodesEmitted` where `errorCode` is stored.
     */
    function saveError(euint8 errorCode) internal returns (uint256) {
        uint256 errorId = _errorCounter;
        _errorCounter++;
        _errorCodesEmitted[errorId] = errorCode;
        TFHE.allowThis(errorCode);
        return errorId;
    }
}
