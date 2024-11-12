// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

contract DefaultFHEVMConfig {
    constructor() {
        TFHE.setFHEVM(FHEVMConfig.defaultConfig());
    }
}
