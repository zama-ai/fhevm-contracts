# fhEVM Contracts

## Description

fhEVM contracts is a Solidity library for secure smart-contract development using
[fhEVM](https://github.com/zama-ai/fhevm) and TFHE.

## Getting Started

### Installation

You can import this repo using your package manager.

```bash
# Using npm
npm install fhevm-contracts

# Using Yarn
yarn add fhevm-contracts

# Using pnpm
pnpm add fhevm-contracts
```

### Simple contract

To write Solidity contracts that use `TFHE` and/or `Gateway`, it is required to set different contract addresses.

Fortunately, [the fhevm repo](https://github.com/zama-ai/fhevm), one of this repo's dependencies, exports config files
that can be inherited to simplify the process.

#### Using the mock network (for testing)

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { MockZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { EncryptedERC20 } from "fhevm-contracts/contracts/token/ERC20/EncryptedERC20.sol";

contract MyERC20 is MockZamaFHEVMConfig, EncryptedERC20 {
  constructor() EncryptedERC20("MyToken", "MYTOKEN") {
    _unsafeMint(1000000, msg.sender);
  }
}
```

#### Using Sepolia

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { EncryptedERC20 } from "fhevm-contracts/contracts/token/ERC20/EncryptedERC20.sol";

contract MyERC20 is SepoliaZamaFHEVMConfig, EncryptedERC20 {
  constructor() EncryptedERC20("MyToken", "MYTOKEN") {
    _unsafeMint(1000000, msg.sender);
  }
}
```

## Available contracts

As of version 0.2, these Solidity templates include governance-related and token-related contracts.

### Token

- [EncryptedERC20](./contracts/token/ERC20/EncryptedERC20.sol)
- [EncryptedERC20Mintable](./contracts/token/ERC20/extensions/EncryptedERC20Mintable.sol)
- [EncryptedERC20WithErrors](./contracts/token/ERC20/extensions/EncryptedERC20WithErrors.sol)
- [EncryptedERC20WithErrorsMintable](./contracts/token/ERC20/extensions/EncryptedERC20WithErrorsMintable.sol)

### Governance

- [Comp](./contracts/governance/Comp.sol)
- [GovernorAlphaZama](./contracts/governance/GovernorAlphaZama.sol)

### Utils

- [EncryptedErrors](./contracts/utils/EncryptedErrors.sol)

### Contributing

There are two ways to contribute to the Zama fhEVM contracts:

- [Open issues](https://github.com/zama-ai/fhevm-contracts/issues/new/choose) to report bugs and typos, or to suggest
  new ideas.
- Request to become an official contributor by emailing hello@zama.ai.

Becoming an approved contributor involves signing our Contributor License Agreement (CLA). Only approved contributors
can send pull requests, so please make sure to get in touch before you do.

### License

Smart contracts are a nascent technology that carry a high level of technical risk and uncertainty. You are solely
responsible for any use of fhEVM Contracts and you assume all risks associated with any such use.

> This software is distributed under the **BSD-3-Clause-Clear** license. If you have any question about the license,
> please contact us at hello@zama.ai.
