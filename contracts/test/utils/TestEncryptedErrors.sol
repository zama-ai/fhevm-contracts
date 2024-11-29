// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { EncryptedErrors } from "../../utils/EncryptedErrors.sol";
import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";

contract TestEncryptedErrors is MockZamaFHEVMConfig, EncryptedErrors {
    constructor(uint8 totalNumberErrorCodes_) EncryptedErrors(totalNumberErrorCodes_) {
        for (uint8 i; i <= totalNumberErrorCodes_; i++) {
            /// @dev It is not possible to access the _errorCodeDefinitions since it is private.
            TFHE.allow(TFHE.asEuint8(i), msg.sender);
        }
    }

    function errorChangeIf(
        einput encryptedCondition,
        einput encryptedErrorCode,
        bytes calldata inputProof,
        uint8 indexCode
    ) external returns (euint8 newErrorCode) {
        ebool condition = TFHE.asEbool(encryptedCondition, inputProof);
        euint8 errorCode = TFHE.asEuint8(encryptedErrorCode, inputProof);
        newErrorCode = _errorChangeIf(condition, indexCode, errorCode);
        _errorSave(newErrorCode);
        TFHE.allow(newErrorCode, msg.sender);
    }

    function errorChangeIfNot(
        einput encryptedCondition,
        einput encryptedErrorCode,
        bytes calldata inputProof,
        uint8 indexCode
    ) external returns (euint8 newErrorCode) {
        ebool condition = TFHE.asEbool(encryptedCondition, inputProof);
        euint8 errorCode = TFHE.asEuint8(encryptedErrorCode, inputProof);
        newErrorCode = _errorChangeIfNot(condition, indexCode, errorCode);
        _errorSave(newErrorCode);
        TFHE.allow(newErrorCode, msg.sender);
    }

    function errorDefineIf(
        einput encryptedCondition,
        bytes calldata inputProof,
        uint8 indexCode
    ) external returns (euint8 errorCode) {
        ebool condition = TFHE.asEbool(encryptedCondition, inputProof);
        errorCode = _errorDefineIf(condition, indexCode);
        _errorSave(errorCode);
        TFHE.allow(errorCode, msg.sender);
    }

    function errorDefineIfNot(
        einput encryptedCondition,
        bytes calldata inputProof,
        uint8 indexCode
    ) external returns (euint8 errorCode) {
        ebool condition = TFHE.asEbool(encryptedCondition, inputProof);
        errorCode = _errorDefineIfNot(condition, indexCode);
        _errorSave(errorCode);
        TFHE.allow(errorCode, msg.sender);
    }

    function errorGetCodeDefinition(uint8 indexCodeDefinition) external view returns (euint8 errorCode) {
        errorCode = _errorGetCodeDefinition(indexCodeDefinition);
    }

    function errorGetCodeEmitted(uint256 errorId) external view returns (euint8 errorCode) {
        errorCode = _errorGetCodeEmitted(errorId);
    }

    function errorGetCounter() external view returns (uint256 countErrors) {
        countErrors = _errorGetCounter();
    }

    function errorGetNumCodesDefined() external view returns (uint8 totalNumberErrorCodes) {
        totalNumberErrorCodes = _errorGetNumCodesDefined();
    }
}
