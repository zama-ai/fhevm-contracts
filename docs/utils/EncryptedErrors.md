# Solidity API

## EncryptedErrors

This abstract contract is used for error handling in the fhEVM.

Error codes are trivially encrypted during construction inside the `errorCodes` array.

WARNING: `errorCodes[0]` should always refer to the `NO_ERROR` code, by default.

### constructor

```solidity
constructor(uint8 numErrors) internal
```

Sets the non-null value for `numErrors` corresponding to the total number of errors.

_`numErrors` must be non-null, note that `errorCodes[0]` corresponds to the `NO_ERROR` code._

#### Parameters

| Name      | Type  | Description                           |
| --------- | ----- | ------------------------------------- |
| numErrors | uint8 | the total number of different errors. |

### getErrorCode

```solidity
function getErrorCode(uint8 indexCode) internal view returns (euint8)
```

Returns the encrypted error code at index `indexCode`.

#### Parameters

| Name      | Type  | Description                            |
| --------- | ----- | -------------------------------------- |
| indexCode | uint8 | the index of the requested error code. |

#### Return Values

| Name | Type   | Description                                      |
| ---- | ------ | ------------------------------------------------ |
| [0]  | euint8 | the encrypted error code located at `indexCode`. |

### getErrorCounter

```solidity
function getErrorCounter() internal view returns (uint256)
```

Returns the total number of error codes currently stored in `errorCodesMapping`.

#### Return Values

| Name | Type    | Description                                                          |
| ---- | ------- | -------------------------------------------------------------------- |
| [0]  | uint256 | the number of error codes stored in the `errorCodesMapping` mapping. |

### getNumErrors

```solidity
function getNumErrors() internal view returns (uint8)
```

Returns the total number of the possible errors.

#### Return Values

| Name | Type  | Description                                        |
| ---- | ----- | -------------------------------------------------- |
| [0]  | uint8 | the total number of the different possible errors. |

### getError

```solidity
function getError(uint256 errorId) internal view returns (euint8)
```

Returns the encrypted error code which was stored in the mapping at key `errorId`.

_`errorId` must be a valid id, i.e below the error counter._

#### Parameters

| Name    | Type    | Description                                                  |
| ------- | ------- | ------------------------------------------------------------ |
| errorId | uint256 | the requested key stored in the `errorCodesMapping` mapping. |

#### Return Values

| Name | Type   | Description                                            |
| ---- | ------ | ------------------------------------------------------ |
| [0]  | euint8 | the encrypted error code located at the `errorId` key. |

### defineErrorIf

```solidity
function defineErrorIf(ebool condition, uint8 indexCode) internal view returns (euint8)
```

Computes an encrypted error code, result will be either a reencryption of `errorCodes[indexCode]` if `condition` is an
encrypted `true` or of `NO_ERROR` otherwise.

_`indexCode` must be non-null and below the total number of error codes._

#### Parameters

| Name      | Type  | Description                                                          |
| --------- | ----- | -------------------------------------------------------------------- |
| condition | ebool | the encrypted boolean used in the cmux.                              |
| indexCode | uint8 | the index of the selected error code if `condition` encrypts `true`. |

#### Return Values

| Name | Type   | Description                                                |
| ---- | ------ | ---------------------------------------------------------- |
| [0]  | euint8 | the reencrypted error code depending on `condition` value. |

### defineErrorIfNot

```solidity
function defineErrorIfNot(ebool condition, uint8 indexCode) internal view returns (euint8)
```

Does the opposite of `defineErrorIf`, i.e result will be either a reencryption of `errorCodes[indexCode]` if `condition`
is an encrypted `false` or of `NO_ERROR` otherwise.

_`indexCode` must be non-null and below the total number of error codes._

#### Parameters

| Name      | Type  | Description                                                           |
| --------- | ----- | --------------------------------------------------------------------- |
| condition | ebool | the encrypted boolean used in the cmux.                               |
| indexCode | uint8 | the index of the selected error code if `condition` encrypts `false`. |

#### Return Values

| Name | Type   | Description                                                |
| ---- | ------ | ---------------------------------------------------------- |
| [0]  | euint8 | the reencrypted error code depending on `condition` value. |

### changeErrorIf

```solidity
function changeErrorIf(ebool condition, uint8 indexCode, euint8 errorCode) internal view returns (euint8)
```

Computes an encrypted error code, result will be either a reencryption of `errorCodes[indexCode]` if `condition` is an
encrypted `true` or of `errorCode` otherwise.

_`indexCode` must be below the total number of error codes._

#### Parameters

| Name      | Type   | Description                                             |
| --------- | ------ | ------------------------------------------------------- |
| condition | ebool  | the encrypted boolean used in the cmux.                 |
| indexCode | uint8  |                                                         |
| errorCode | euint8 | the selected error code if `condition` encrypts `true`. |

#### Return Values

| Name | Type   | Description                                                |
| ---- | ------ | ---------------------------------------------------------- |
| [0]  | euint8 | the reencrypted error code depending on `condition` value. |

### changeErrorIfNot

```solidity
function changeErrorIfNot(ebool condition, uint8 indexCode, euint8 errorCode) internal view returns (euint8)
```

Does the opposite of `changeErrorIf`, i.e result will be either a reencryption of `errorCodes[indexCode]` if `condition`
is an encrypted `false` or of `errorCode` otherwise.

_`indexCode` must be below the total number of error codes._

#### Parameters

| Name      | Type   | Description                                              |
| --------- | ------ | -------------------------------------------------------- |
| condition | ebool  | the encrypted boolean used in the cmux.                  |
| indexCode | uint8  |                                                          |
| errorCode | euint8 | the selected error code if `condition` encrypts `false`. |

#### Return Values

| Name | Type   | Description                                                |
| ---- | ------ | ---------------------------------------------------------- |
| [0]  | euint8 | the reencrypted error code depending on `condition` value. |

### saveError

```solidity
function saveError(euint8 errorCode) internal returns (uint256)
```

Saves `errorCode` in storage, in the `errorCodesMapping` mapping, at the lowest unused key. This is the only stateful
function of `EncryptedErrors` abstract contract.

#### Parameters

| Name      | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------ |
| errorCode | euint8 | the encrypted error code to be saved in storage. |

#### Return Values

| Name | Type    | Description                                                           |
| ---- | ------- | --------------------------------------------------------------------- |
| [0]  | uint256 | the `errorId` key in `errorCodesMapping` where `errorCode` is stored. |
