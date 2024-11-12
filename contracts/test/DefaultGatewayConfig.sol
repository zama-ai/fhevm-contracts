// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/gateway/GatewayCaller.sol";

contract DefaultGatewayConfig {
    constructor() {
        Gateway.setGateway(Gateway.defaultGatewayAddress());
    }
}
