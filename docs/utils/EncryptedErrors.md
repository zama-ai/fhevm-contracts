# EncryptedErrors

This abstract contract is used for error handling in the fhEVM. Error codes are encrypted in the constructor inside the
`_errorCodeDefinitions` mapping.

_`_errorCodeDefinitions[0]` should always refer to the `NO_ERROR` code, by default._

### ErrorIndexInvalid

```solidity
error ErrorIndexInvalid()
```

Returned if the error index is invalid.

### ErrorIndexIsNull

```solidity
error ErrorIndexIsNull()
```

Returned if the error index is null.

### TotalNumberErrorCodesEqualToZero

```solidity
error TotalNumberErrorCodesEqualToZero()
```

Returned if the total number of errors is equal to zero.

### constructor

```solidity
constructor(uint8 totalNumberErrorCodes_) internal
```

Sets the non-null value for `_TOTAL_NUMBER_ERROR_CODES` corresponding to the total number of errors.

_`totalNumberErrorCodes_` must be non-null                               (`_errorCodeDefinitions[0]`corresponds to the`NO_ERROR`
code)._

#### Parameters

| Name                    | Type  | Description                       |
| ----------------------- | ----- | --------------------------------- |
| totalNumberErrorCodes\_ | uint8 | Total number of different errors. |

### \_errorChangeIf

```solidity
function _errorChangeIf(ebool condition, uint8 indexCode, euint8 errorCode) internal virtual returns (euint8 newErrorCode)
```

Computes an encrypted error code, result will be either a reencryption of `_errorCodeDefinitions[indexCode]` if
`condition` is an encrypted `true` or of `errorCode` otherwise.

_`   indexCode` must be below the total number of error codes._

#### Parameters

| Name      | Type   | Description                                         |
| --------- | ------ | --------------------------------------------------- |
| condition | ebool  | Encrypted boolean used in the select operator.      |
| indexCode | uint8  |                                                     |
| errorCode | euint8 | Selected error code if `condition` encrypts `true`. |

#### Return Values

| Name         | Type   | Description                                                |
| ------------ | ------ | ---------------------------------------------------------- |
| newErrorCode | euint8 | New reencrypted error code depending on `condition` value. |

### \_errorChangeIfNot

```solidity
function _errorChangeIfNot(ebool condition, uint8 indexCode, euint8 errorCode) internal virtual returns (euint8 newErrorCode)
```

Does the opposite of `changeErrorIf`, i.e result will be either a reencryption of `_errorCodeDefinitions[indexCode]` if
`condition` is an encrypted `false` or of `errorCode` otherwise.

_`indexCode` must be below the total number of error codes._

#### Parameters

| Name      | Type   | Description                                              |
| --------- | ------ | -------------------------------------------------------- |
| condition | ebool  | The encrypted boolean used in the `TFHE.select`.         |
| indexCode | uint8  |                                                          |
| errorCode | euint8 | The selected error code if `condition` encrypts `false`. |

#### Return Values

| Name         | Type   | Description                                    |
| ------------ | ------ | ---------------------------------------------- |
| newErrorCode | euint8 | New error code depending on `condition` value. |

### \_errorDefineIf

```solidity
function _errorDefineIf(ebool condition, uint8 indexCode) internal virtual returns (euint8 errorCode)
```

Computes an encrypted error code, result will be either a reencryption of `_errorCodeDefinitions[indexCode]` if
`condition` is an encrypted `true` or of `NO_ERROR` otherwise.

_`indexCode` must be non-null and below the total number of defined error codes._

#### Parameters

| Name      | Type  | Description                                                      |
| --------- | ----- | ---------------------------------------------------------------- |
| condition | ebool | Encrypted boolean used in the select operator.                   |
| indexCode | uint8 | Index of the selected error code if `condition` encrypts `true`. |

#### Return Values

| Name      | Type   | Description                                            |
| --------- | ------ | ------------------------------------------------------ |
| errorCode | euint8 | Reencrypted error code depending on `condition` value. |

### \_errorDefineIfNot

```solidity
function _errorDefineIfNot(ebool condition, uint8 indexCode) internal virtual returns (euint8 errorCode)
```

Does the opposite of `defineErrorIf`, i.e result will be either a reencryption of `_errorCodeDefinitions[indexCode]` if
`condition` is an encrypted `false` or of `NO_ERROR` otherwise.

_`indexCode` must be non-null and below the total number of defined error codes._

#### Parameters

| Name      | Type  | Description                                                       |
| --------- | ----- | ----------------------------------------------------------------- |
| condition | ebool | Encrypted boolean used in the select operator.                    |
| indexCode | uint8 | Index of the selected error code if `condition` encrypts `false`. |

#### Return Values

| Name      | Type   | Description                                            |
| --------- | ------ | ------------------------------------------------------ |
| errorCode | euint8 | Reencrypted error code depending on `condition` value. |

### \_errorSave

```solidity
function _errorSave(euint8 errorCode) internal virtual returns (uint256 errorId)
```

Saves `errorCode` in storage, in the `_errorCodesEmitted` mapping.

#### Parameters

| Name      | Type   | Description                                  |
| --------- | ------ | -------------------------------------------- |
| errorCode | euint8 | Encrypted error code to be saved in storage. |

#### Return Values

| Name    | Type    | Description                                                            |
| ------- | ------- | ---------------------------------------------------------------------- |
| errorId | uint256 | The `errorId` key in `_errorCodesEmitted` where `errorCode` is stored. |

### \_errorGetCodeDefinition

```solidity
function _errorGetCodeDefinition(uint8 indexCodeDefinition) internal view virtual returns (euint8 errorCode)
```

Returns the trivially encrypted error code at index `indexCodeDefinition`.

#### Parameters

| Name                | Type  | Description                                   |
| ------------------- | ----- | --------------------------------------------- |
| indexCodeDefinition | uint8 | Index of the requested error code definition. |

#### Return Values

| Name      | Type   | Description                                                                       |
| --------- | ------ | --------------------------------------------------------------------------------- |
| errorCode | euint8 | Encrypted error code located at `indexCodeDefinition` in `_errorCodeDefinitions`. |

### \_errorGetCodeEmitted

```solidity
function _errorGetCodeEmitted(uint256 errorId) internal view virtual returns (euint8 errorCode)
```

Returns the encrypted error code which was stored in `_errorCodesEmitted` at key `errorId`.

_`errorId` must be a valid id, i.e below the error counter._

#### Parameters

| Name    | Type    | Description                                               |
| ------- | ------- | --------------------------------------------------------- |
| errorId | uint256 | Requested key stored in the `_errorCodesEmitted` mapping. |

#### Return Values

| Name      | Type   | Description                                        |
| --------- | ------ | -------------------------------------------------- |
| errorCode | euint8 | Encrypted error code located at the `errorId` key. |

### \_errorGetCounter

```solidity
function _errorGetCounter() internal view virtual returns (uint256 countErrors)
```

Returns the total counter of emitted of error codes.

#### Return Values

| Name        | Type    | Description               |
| ----------- | ------- | ------------------------- |
| countErrors | uint256 | Number of errors emitted. |

### \_errorGetNumCodesDefined

```solidity
function _errorGetNumCodesDefined() internal view virtual returns (uint8 totalNumberErrorCodes)
```

Returns the total number of the possible error codes defined.

#### Return Values

| Name                  | Type  | Description                                         |
| --------------------- | ----- | --------------------------------------------------- |
| totalNumberErrorCodes | uint8 | Total number of the different possible error codes. |
