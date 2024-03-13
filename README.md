# fhEVM Contracts

<p align="center">
  <a href="./fhevm-whitepaper.pdf"> 📃 Read white paper</a> |<a href="https://docs.zama.ai/fhevm"> 📒 Documentation</a> | <a href="https://zama.ai/community"> 💛 Community support</a> | <a href="https://github.com/zama-ai/awesome-zama"> 📚 FHE resources by Zama</a>
</p>

<p align="center">
  <a href="https://github.com/zama-ai/fhevm/releases"><img src="https://img.shields.io/github/v/release/zama-ai/fhevm?style=flat-square"></a>
  <a href="license"><img src="https://img.shields.io/badge/License-BSD--3--Clause--Clear-%23ffb243?style=flat-square"></a>
  <a href="https://github.com/zama-ai/bounty-program"><img src="https://img.shields.io/badge/Contribute-Zama%20Bounty%20Program-%23ffd208?style=flat-square"></a>
</p>

fhEVM contracts is a library for encrypted smart contract development on fhEVM.

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

pragma solidity ^0.8.20;

import "fhevm/lib/TFHE.sol";
import "fhevm-contracts/contracts/token/ERC20/EncryptedERC20.sol";

contract MyERC20 is EncryptedERC20 {
  function _transfer(address from, address to, uint256 amount) internal virtual override {
    require(_validRecipient(to), "ERC20WithSafeTransfer: invalid recipient");
    super._transfer(from, to, amount);
  }

  function _validRecipient(address to) private view returns (bool) {
    ...
  }
}
```

## Resources

### Documentation

Full, comprehensive documentation is available here: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm).

### Citations

To cite fhEVM or the whitepaper in academic papers, please use the following entries:

```text
@Misc{fhEVM,
title={{Private smart contracts on the EVM using homomorphic encryption}},
author={Zama},
year={2023},
note={\url{https://github.com/zama-ai/fhevm}},
}
```

```text
@techreport{fhEVM,
author = "Morten Dahl, Clément Danjou, Daniel Demmler, Tore Frederiksen, Petar Ivanov,
Marc Joye, Dragos Rotaru, Nigel Smart, Louis Tremblay Thibault
",
title = "Confidential EVM Smart Contracts using Fully Homomorphic Encryption",
institution = "Zama",
year = "2023"
}
```

### Contributing

There are two ways to contribute to the Zama fhEVM contracts:

- [Open issues](https://github.com/zama-ai/fhevm-contracts/issues/new/choose) to report bugs and typos, or to suggest new ideas
- Request to become an official contributor by emailing hello@zama.ai.

Becoming an approved contributor involves signing our Contributor License Agreement (CLA)). Only approved contributors can send pull requests, so please make sure to get in touch before you do!
<br></br>

### License

This software is distributed under the **BSD-3-Clause-Clear** license. If you have any questions, please contact us at hello@zama.ai.

<p align="right">
  <a href="#table-of-contents" > ↑ Back to top </a> 
</p>

## Support

<a target="_blank" href="https://community.zama.ai">
  <img src="https://github.com/zama-ai/fhevm/assets/157474013/4e75e34e-df3f-4e9e-8a22-12b1d4013578">
</a>

🌟 If you find this project helpful or interesting, please consider giving it a star on GitHub! Your support helps to grow the community and motivates further development.

<p align="right">
  <a href="#about" > ↑ Back to top </a> 
</p>
