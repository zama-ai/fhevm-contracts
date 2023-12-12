// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (utils/Strings.sol)

pragma solidity 0.8.19;

import "fhevm/lib/TFHE.sol";

abstract contract EncryptedLastErrors {
    mapping(address => euint8) internal _lastErrors;

    event ErrorChanged(address addr);

    function setLastError(euint8 error) private {
        setLastError(error, msg.sender);
    }

    function setLastError(euint8 error, address addr) private {
        _lastErrors[addr] = error;
        emit ErrorChanged(addr);
    }

    function reencryptLastError(bytes32 publicKey) private view returns (bytes memory) {
        return reencryptLastError(publicKey, msg.sender);
    }

    function reencryptLastError(bytes32 publicKey, address addr) private view returns (bytes memory) {
        return TFHE.reencrypt(getLastError(addr), publicKey, 0);
    }

    function getLastError() private view returns (euint8) {
        return getLastError(msg.sender);
    }

    function getLastError(address addr) private view returns (euint8) {
        return _lastErrors[addr];
    }
}
