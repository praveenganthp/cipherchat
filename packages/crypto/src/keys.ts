import {
  getSubtleCrypto,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
} from "./utils.js";

export interface SerializedKeyPair {
  publicKey: string;  // Base64 SPKI
  privateKey: string; // Base64 PKCS#8
}

/**
 * Generate Identity Key Pair (ECDSA with NIST P-256 / SHA-256)
 * Used for long-term device identification, message signing, and key attestation.
 */
export async function generateIdentityKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  serialized: SerializedKeyPair;
}> {
  const subtle = getSubtleCrypto();
  const keyPair = await subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true, // extractable
    ["sign", "verify"]
  );

  const spki = await subtle.exportKey("spki", keyPair.publicKey);
  const pkcs8 = await subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    keyPair,
    serialized: {
      publicKey: arrayBufferToBase64(spki),
      privateKey: arrayBufferToBase64(pkcs8),
    },
  };
}

/**
 * Generate PreKey Pair (ECDH with NIST P-256)
 * Used for asynchronous Diffie-Hellman key agreement without requiring both parties online.
 */
export async function generatePreKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  serialized: SerializedKeyPair;
}> {
  const subtle = getSubtleCrypto();
  const keyPair = await subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );

  const spki = await subtle.exportKey("spki", keyPair.publicKey);
  const pkcs8 = await subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    keyPair,
    serialized: {
      publicKey: arrayBufferToBase64(spki),
      privateKey: arrayBufferToBase64(pkcs8),
    },
  };
}

/**
 * Generate Ephemeral Key Pair (ECDH P-256) for a single message envelope
 */
export async function generateEphemeralKeyPair(): Promise<CryptoKeyPair> {
  const subtle = getSubtleCrypto();
  return subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Sign a public PreKey using the device Identity Private Key
 */
export async function signPreKey(
  identityPrivateKey: CryptoKey,
  preKeyPublicSpkiBase64: string
): Promise<string> {
  const subtle = getSubtleCrypto();
  const data = stringToArrayBuffer(`cipherchat:prekey:${preKeyPublicSpkiBase64}`);
  const signature = await subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    identityPrivateKey,
    data
  );
  return arrayBufferToBase64(signature);
}

/**
 * Verify a PreKey signature using the sender's Identity Public Key
 */
export async function verifyPreKeySignature(
  identityPublicKey: CryptoKey,
  preKeyPublicSpkiBase64: string,
  signatureBase64: string
): Promise<boolean> {
  const subtle = getSubtleCrypto();
  const data = stringToArrayBuffer(`cipherchat:prekey:${preKeyPublicSpkiBase64}`);
  const signature = base64ToArrayBuffer(signatureBase64);
  return subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    identityPublicKey,
    signature,
    data
  );
}

/**
 * Import ECDSA Public Key from Base64 SPKI
 */
export async function importIdentityPublicKey(base64Spki: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const buffer = base64ToArrayBuffer(base64Spki);
  return subtle.importKey(
    "spki",
    buffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
}

/**
 * Import ECDSA Private Key from Base64 PKCS#8
 */
export async function importIdentityPrivateKey(base64Pkcs8: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const buffer = base64ToArrayBuffer(base64Pkcs8);
  return subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"]
  );
}

/**
 * Import ECDH Public Key from Base64 SPKI
 */
export async function importPreKeyPublic(base64Spki: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const buffer = base64ToArrayBuffer(base64Spki);
  return subtle.importKey(
    "spki",
    buffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

/**
 * Import ECDH Private Key from Base64 PKCS#8
 */
export async function importPreKeyPrivate(base64Pkcs8: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const buffer = base64ToArrayBuffer(base64Pkcs8);
  return subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Export CryptoKey to Base64 SPKI
 */
export async function exportPublicKeySpki(key: CryptoKey): Promise<string> {
  const subtle = getSubtleCrypto();
  const spki = await subtle.exportKey("spki", key);
  return arrayBufferToBase64(spki);
}
