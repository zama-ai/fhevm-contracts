export const EBOOL_T = 0;
export const EUINT4_T = 1;
export const EUINT8_T = 2;
export const EUINT16_T = 3;
export const EUINT32_T = 4;
export const EUINT64_T = 5;
export const EUINT128_T = 6;
export const EUINT160_T = 7; // @dev It is the one for eaddresses.
export const EUINT256_T = 8;
export const EBYTES64_T = 9;
export const EBYTES128_T = 10;
export const EBYTES256_T = 11;

export function verifyType(handle: bigint, expectedType: number) {
  if (handle === 0n) {
    throw "Handle is not initialized";
  }

  if (handle.toString(2).length === 34) {
    throw "Handle is not a bytes32";
  }

  const typeCt = handle >> 8n;

  if (Number(typeCt % 256n) !== expectedType) {
    throw "Wrong encrypted type for the handle";
  }
}
