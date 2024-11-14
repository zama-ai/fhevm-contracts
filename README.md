# fhEVM Contracts

## Description

fhEVM contracts is a Solidity library for secure smart-contract development using
[fhEVM](https://github.com/zama-ai/fhevm) and TFHE.

## Getting Started

### Installation

```bash
# Using npm
npm install fhevm-contracts

# Using Yarn
yarn add fhevm-contracts

# Using pnpm
pnpm add fhevm-contracts
```

### A Simple Example

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm-contracts/contracts/token/ERC20/EncryptedERC20.sol";

contract MyERC20 is EncryptedERC20 {
  constructor() EncryptedERC20("MyToken", "MYTOKEN") {
    TFHE.setFHEVM(FHEVMConfig.defaultConfig());
    _unsafeMint(1000000, msg.sender);
  }
}
```

## Resources

### Documentation

The full documentation is available [here](https://docs.zama.ai/fhevm).

### Contributing

There are two ways to contribute to the Zama fhEVM contracts:

- [Open issues](https://github.com/zama-ai/fhevm-contracts/issues/new/choose) to report bugs and typos, or to suggest
  new ideas.
- Request to become an official contributor by emailing hello@zama.ai.

Becoming an approved contributor involves signing our Contributor License Agreement (CLA). Only approved contributors
can send pull requests, so please make sure to get in touch before you do.

### License

This software is distributed under the **BSD-3-Clause-Clear** license. If you have any question about the license,
please contact us at hello@zama.ai.
