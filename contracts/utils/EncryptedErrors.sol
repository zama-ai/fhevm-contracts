// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.20;

import "fhevm/lib/TFHE.sol";

/**
 * This abstract contract is used for error handling in the fhEVM.
 *
 * Error codes are trivially encrypted during construction inside the `errorCodes` array.
 *
 * WARNING: `errorCodes[0]` should always refer to the `NO_ERROR` code, by default.
 *
 */
abstract contract EncryptedErrors {
    uint8 private immutable totalNumErrors;
    euint8[] private errorCodes;
    uint256 private counterErrors; // used to keep track of each error index

    // A mapping from errorId to the errorCode
    mapping(uint256 => euint8) private errorCodesMapping;

    /**
     * @notice Sets the non-null value for `numErrors` corresponding to the total number of errors.
     * @param numErrors the total number of different errors.
     * @dev `numErrors` must be non-null, note that `errorCodes[0]` corresponds to the `NO_ERROR` code.
     */
    constructor(uint8 numErrors) {
        require(numErrors != 0, "numErrors must be greater than 0");
        for (uint256 i = 0; i <= numErrors; i++) {
            errorCodes.push(TFHE.asEuint8(i));
        }
        totalNumErrors = numErrors;
    }

    /**
     * @notice Returns the encrypted error code at index `indexCode`.
     * @param indexCode the index of the requested error code.
     * @return the encrypted error code located at `indexCode`.
     */
    function getErrorCode(uint8 indexCode) internal view returns (euint8) {
        return errorCodes[indexCode];
    }

    /**
     * @notice Returns the total number of error codes currently stored in `errorCodesMapping`.
     * @return the number of error codes stored in the `errorCodesMapping` mapping.
     */
    function getErrorCounter() internal view returns (uint256) {
        return counterErrors;
    }

    /**
     * @notice Returns the total number of the possible errors.
     * @return the total number of the different possible errors.
     */
    function getNumErrors() internal view returns (uint8) {
        return totalNumErrors;
    }

    /**
     * @notice Returns the encrypted error code which was stored in the mapping at key `errorId`.
     * @param errorId the requested key stored in the `errorCodesMapping` mapping.
     * @return the encrypted error code located at the `errorId` key.
     * @dev `errorId` must be a valid id, i.e below the error counter.
     */
    function getError(uint256 errorId) internal view returns (euint8) {
        require(errorId < counterErrors, "errorId must be a valid id");
        return errorCodesMapping[errorId];
    }

    /**
     * @notice Computes an encrypted error code, result will be either a reencryption of
     * `errorCodes[indexCode]` if `condition` is an encrypted `true` or of `NO_ERROR` otherwise.
     * @param condition the encrypted boolean used in the cmux.
     * @param indexCode the index of the selected error code if `condition` encrypts `true`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be non-null and below the total number of error codes.
     */
    function defineErrorIf(ebool condition, uint8 indexCode) internal view returns (euint8) {
        require(indexCode != 0, "indexCode must be greater than 0");
        require(indexCode <= totalNumErrors, "indexCode must be a valid error code");
        euint8 errorCode = TFHE.select(condition, errorCodes[indexCode], errorCodes[0]);
        return errorCode;
    }

    /**
     * @notice Does the opposite of `defineErrorIf`, i.e result will be either a reencryption of
     * `errorCodes[indexCode]` if `condition` is an encrypted `false` or of `NO_ERROR` otherwise.
     * @param condition the encrypted boolean used in the cmux.
     * @param indexCode the index of the selected error code if `condition` encrypts `false`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be non-null and below the total number of error codes.
     */
    function defineErrorIfNot(ebool condition, uint8 indexCode) internal view returns (euint8) {
        require(indexCode != 0, "indexCode must be greater than 0");
        require(indexCode <= totalNumErrors, "indexCode must be a valid error code");
        euint8 errorCode = TFHE.select(condition, errorCodes[0], errorCodes[indexCode]);
        return errorCode;
    }

    /**
     * @notice Computes an encrypted error code, result will be either a reencryption of
     * `errorCodes[indexCode]` if `condition` is an encrypted `true` or of `errorCode` otherwise.
     * @param condition the encrypted boolean used in the cmux.
     * @param errorCode the selected error code if `condition` encrypts `true`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be below the total number of error codes.
     */
    function changeErrorIf(ebool condition, uint8 indexCode, euint8 errorCode) internal view returns (euint8) {
        require(indexCode <= totalNumErrors, "indexCode must be a valid error code");
        return TFHE.select(condition, errorCodes[indexCode], errorCode);
    }

    /**
     * @notice Does the opposite of `changeErrorIf`, i.e result will be either a reencryption of
     * `errorCodes[indexCode]` if `condition` is an encrypted `false` or of `errorCode` otherwise.
     * @param condition the encrypted boolean used in the cmux.
     * @param errorCode the selected error code if `condition` encrypts `false`.
     * @return the reencrypted error code depending on `condition` value.
     * @dev `indexCode` must be below the total number of error codes.
     */
    function changeErrorIfNot(ebool condition, uint8 indexCode, euint8 errorCode) internal view returns (euint8) {
        require(indexCode <= totalNumErrors, "indexCode must be a valid error code");
        return TFHE.select(condition, errorCode, errorCodes[indexCode]);
    }

    /**
     * @notice Saves `errorCode` in storage, in the `errorCodesMapping` mapping, at the lowest unused key.
     * This is the only stateful function of `EncryptedErrors` abstract contract.
     * @param errorCode the encrypted error code to be saved in storage.
     * @return the `errorId` key in `errorCodesMapping` where `errorCode` is stored.
     */
    function saveError(euint8 errorCode) internal returns (uint256) {
        uint256 errorId = counterErrors;
        counterErrors++;
        errorCodesMapping[errorId] = errorCode;
        return errorId;
    }
}
