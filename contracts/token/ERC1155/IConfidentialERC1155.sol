// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

/**
 * @title       IConfidentialERC1155.
 * @notice      Interface that defines ERC1155-like tokens with encrypted balances.
 */
interface IConfidentialERC1155 {
    /**
     * @notice Emitted when `account` grants or revokes permission to `operator` to transfer their tokens, according to
     *         `approved`.
     */
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    /**
     * @notice          Emitted when `value` amount of tokens of type `id` are transferred from `from` to `to` by
     *                  `operator`.
     * @dev             Last argument is either a default placeholder, typically equal to max(uint256), in case of
     *                  a ConfidentialERC1155 without error handling, or an errorId in case of encrypted error handling.
     * @param operator  Operator address.
     * @param from      Address transferring the id.
     * @param to        Address receiving the id.
     * @param id        Token id.
     * @param value     Place holder.
     */
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);

    /**
     * @notice          Emitted when batch `value` amount of tokens of type `id` are transferred from `from` to `to`.
     * @dev             Last argument is either a default placeholder, typically equal to max(uint256), in case of
     *                  a ConfidentialERC1155 without error handling, or an errorId in case of encrypted error handling.
     * @param operator  Operator address.
     * @param from      Address transferring the id.
     * @param to        Address receiving the id.
     * @param ids       Array of token ids.
     * @param values    Place holder.
     */
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );

    /**
     * @notice      Emitted when URI is updated for a token id.
     * @dev         URIs are defined in RFC 3986.
     *              It must point to a JSON file that conforms to the "ERC-1155 Metadata URI JSON Schema".
     * @param value JSON file address.
     * @param id    Token id.
     */
    event URI(string value, uint256 indexed id);

    /**
     * @notice          Returns the encrypted value of tokens of token type `id` owned by `account`.
     * @param account   Account address.
     * @param id        Token id.
     */
    function balanceOf(address account, uint256 id) external view returns (euint64);

    /**
     * @notice          Returns the encrypted values for balance of ids for accounts.
     * @dev             `accounts` and `ids` must have the same length.
     * @param accounts  Array of account addresses.
     * @param ids       Array of token ids.
     */
    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view returns (euint64[] memory);

    /**
     * @notice              Sets approval for all ids to be transferred.
     * @param operator      Operator address.
     * @param approved      True if the operator is approved, false if not approved.
     */
    function setApprovalForAll(address operator, bool approved) external;

    /**
     * @notice            Returns whether an operator is approved to transfer all ids.
     * @param account     Account address whose ids can be transferred by the operator.
     * @param operator    Address of authorized operator.
     */
    function isApprovedForAll(address account, address operator) external view returns (bool);

    /**
     * @notice                  Transfers an encrypted value of `id` from the `from` address
     *                          to the `to` address.
     * @param from              Address transferring the id.
     * @param to                Address receiving the id.
     * @param id                Token id.
     * @param encryptedValue    Encrypted value.
     * @param data              Data.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        euint64 encryptedValue,
        bytes calldata data
    ) external;

    /**
     * @notice                  Transfers an encrypted value of `id` from the `from` address
     *                          to the `to` address.
     * @param from              Address transferring the id.
     * @param to                Address receiving the id.
     * @param id                Token id.
     * @param encryptedValue    Encrypted value.
     * @param encryptedProof    Encrypted proof.
     * @param data              Data.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        einput encryptedValue,
        bytes calldata encryptedProof,
        bytes calldata data
    ) external;

    /**
     * @notice                   Transfers encrypted values of `ids` from the `from` address to the `to` address.
     * @param from               Address transferring the id.
     * @param to                 Address receiving the id.
     * @param ids                Array of token ids.
     * @param encryptedValues    Array of encrypted values.
     * @param data               Data.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        euint64[] calldata encryptedValues,
        bytes calldata data
    ) external;

    /**
     * @notice                   Transfers encrypted values of `ids` from the `from` address to the `to` address.
     * @param from               Address transferring the id.
     * @param to                 Address receiving the id.
     * @param ids                Array of token ids.
     * @param encryptedValues    Packed encrypted values.
     * @param encryptedProof     Encrypted proof.
     * @param data               Data.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        einput encryptedValues,
        bytes calldata encryptedProof,
        bytes calldata data
    ) external;
}
