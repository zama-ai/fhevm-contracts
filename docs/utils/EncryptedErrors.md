## EncryptedErrors

This abstract contract is used for error handling in the fhEVM. Error codes are encrypted in the constructor inside the
`errorCodes` mapping.

_`errorCodes[0]` should always refer to the `NO_ERROR` code, by default._

### TotalNumberErrorsEqualToZero

```solidity
error TotalNumberErrorsEqualToZero()
```

The total number of errors is equal to zero.

### \_errorCodes

```solidity
mapping(uint8 => euint8) _errorCodes
```

Mapping of error codes.

_It does not use arrays they are more expensive than mappings._

### constructor

```solidity
constructor(uint8 totalNumberErrors_) internal
```

Sets the non-null value for `numErrors` corresponding to the total number of errors.

_`numErrors` must be non-null (`errorCodes[0]` corresponds to the `NO_ERROR` code)._

#### Parameters

| Name                | Type  | Description                       |
| ------------------- | ----- | --------------------------------- |
| totalNumberErrors\_ | uint8 | total number of different errors. |

### getTotalNumberErrors

```solidity
function getTotalNumberErrors() external view returns (uint8 totalNumberErrors)
```

Returns the total number of errors.

_It does not count `NO_ERROR` as one of the errors._

#### Return Values

| Name              | Type  | Description             |
| ----------------- | ----- | ----------------------- |
| totalNumberErrors | uint8 | total number of errors. |
