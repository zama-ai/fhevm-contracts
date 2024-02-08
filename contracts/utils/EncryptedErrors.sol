// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (utils/Strings.sol)

pragma solidity ^0.8.20;

import "fhevm/lib/TFHE.sol";

/**
 * @dev This abstract contract is used for error handling in the fhEVM.
 *
 * Error codes are trivially encrypted during construction inside the {errorCodes} array.
 * WARNING: errorCodes[0] should always refer to the NO_ERROR code, by default.
 *
 */
abstract contract EncryptedErrors {
    euint8[] private errorCodes;
    uint256 internal counterErrors; // used to keep track of each error index

    // A mapping from errorId to the errorCode
    mapping(uint256 => euint8) internal errorCodesMapping;

    constructor(uint256 numErrors) {
        require(numErrors != 0, "numErrors must be greater than 0");
        for (uint256 i = 0; i < numErrors; i++) {
            errorCodes.push(TFHE.asEuint8(i));
        }
    }

    function getErrorCode(uint8 indexCode) internal view returns (euint8) {
        return errorCodes[indexCode];
    }

    function getErrorCounter() internal view returns (uint256) {
        return counterErrors;
    }

    function getError(uint256 errorId) internal view returns (euint8) {
        return errorCodesMapping[errorId];
    }

    function setErrorIf(ebool condition, uint8 indexCode) internal returns (uint256) {
        require(indexCode != 0, "indexCode must be greater than 0");
        uint256 errorId = counterErrors;
        counterErrors++;
        euint8 errorCode = TFHE.cmux(condition, errorCodes[indexCode], errorCodes[0]);
        errorCodesMapping[errorId] = errorCode;
        return errorId;
    }

    function setErrorIfNot(ebool condition, uint8 indexCode) internal returns (uint256) {
        require(indexCode != 0, "indexCode must be greater than 0");
        uint256 errorId = counterErrors;
        counterErrors++;
        euint8 errorCode = TFHE.cmux(condition, errorCodes[0], errorCodes[indexCode]);
        errorCodesMapping[errorId] = errorCode;
        return errorId;
    }

    function changeErrorIf(ebool condition, uint8 indexCode, uint256 errorId) internal {
        require(errorId < counterErrors, "Error index too big");
        errorCodesMapping[errorId] = TFHE.cmux(condition, errorCodes[indexCode], errorCodesMapping[errorId]);
    }

    function changeErrorIfNot(ebool condition, uint8 indexCode, uint256 errorId) internal {
        require(errorId < counterErrors, "Error index too big");
        errorCodesMapping[errorId] = TFHE.cmux(condition, errorCodesMapping[errorId], errorCodes[indexCode]);
    }
}
