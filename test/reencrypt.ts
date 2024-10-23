import { Signers } from "./signers";
import { FhevmInstances } from "./types";

/**
 * @debug
 * This function is to reencrypt handles.
 */
export async function reencryptHandle(
  signers: Signers,
  instances: FhevmInstances,
  user: string,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  // Verify if the type is matched
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
