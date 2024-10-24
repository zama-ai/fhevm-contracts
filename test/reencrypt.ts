import {
  EBOOL_T,
  EBYTES64_T,
  EBYTES128_T,
  EBYTES256_T,
  EUINT4_T,
  EUINT8_T,
  EUINT16_T,
  EUINT32_T,
  EUINT64_T,
  EUINT128_T,
  EUINT160_T,
  EUINT256_T,
  verifyType,
} from "./handleTypeCheck";
import { Signers } from "./signers";
import { FhevmInstances } from "./types";

export async function reencryptEbool(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<boolean> {
  verifyType(handle, EBOOL_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint4(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT4_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint8(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT8_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint16(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT16_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint32(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT32_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint64(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT64_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEuint128(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT128_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEAddress(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<string> {
  verifyType(handle, EUINT160_T);
  const addressAsUint160: bigint = await reencryptHandle(signers, instances, user, handle, contractAddress);
  const handleStr = "0x" + addressAsUint160.toString(16).padStart(40, "0");
  return handleStr;
}

export async function reencryptEuint256(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT256_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEbytes64(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EBYTES64_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEbytes128(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EBYTES128_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

export async function reencryptEbytes256(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EBYTES256_T);
  return reencryptHandle(signers, instances, user, handle, contractAddress);
}

/**
 * @dev This function is to reencrypt handles.
 *      It does not verify types.
 */
async function reencryptHandle(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<any> {
  const { publicKey: publicKey, privateKey: privateKey } = instances[user as keyof FhevmInstances].generateKeypair();
  const eip712 = instances[user as keyof FhevmInstances].createEIP712(publicKey, contractAddress);
  const signature = await signers[user as keyof Signers].signTypedData(
    eip712.domain,
    { Reencrypt: eip712.types.Reencrypt },
    eip712.message,
  );

  const reencryptedHandle = await instances[user as keyof FhevmInstances].reencrypt(
    handle,
    privateKey,
    publicKey,
    signature.replace("0x", ""),
    contractAddress,
    signers[user as keyof Signers].address,
  );

  return reencryptedHandle;
}
