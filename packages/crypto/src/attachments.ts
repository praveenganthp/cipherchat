import {
  getSubtleCrypto,
  getRandomValues,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  bufferToHex,
} from "./utils.js";

export interface EncryptedFileResult {
  ciphertextBytes: Uint8Array;
  keyBase64: string;  // 256-bit AES-GCM key exported as raw Base64
  ivBase64: string;   // 96-bit IV
  sha256Hex: string;  // SHA-256 integrity hash of ciphertext
}

/**
 * Encrypt file buffer locally with fresh random AES-256-GCM key
 */
export async function encryptFileBuffer(fileBytes: Uint8Array): Promise<EncryptedFileResult> {
  const subtle = getSubtleCrypto();

  // 1. Generate random 256-bit AES-GCM key
  const aesKey = await subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable so we can share it via the E2EE envelope
    ["encrypt", "decrypt"]
  );

  // 2. Generate random 96-bit IV
  const ivBytes = getRandomValues(new Uint8Array(12));

  // 3. Encrypt file bytes
  const encryptedBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes.buffer as ArrayBuffer,
      tagLength: 128,
    },
    aesKey,
    fileBytes.buffer as ArrayBuffer
  );

  const ciphertextBytes = new Uint8Array(encryptedBuffer);

  // 4. Calculate SHA-256 hash of ciphertext for upload integrity
  const hashBuffer = await subtle.digest("SHA-256", ciphertextBytes.buffer as ArrayBuffer);
  const sha256Hex = bufferToHex(hashBuffer);

  // 5. Export key as base64 raw bytes
  const rawKey = await subtle.exportKey("raw", aesKey);

  return {
    ciphertextBytes,
    keyBase64: arrayBufferToBase64(rawKey),
    ivBase64: arrayBufferToBase64(ivBytes),
    sha256Hex,
  };
}

/**
 * Decrypt file buffer locally after verifying SHA-256 checksum
 */
export async function decryptFileBuffer(
  ciphertextBytes: Uint8Array,
  keyBase64: string,
  ivBase64: string,
  expectedSha256Hex?: string
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();

  // 1. Verify integrity hash if provided
  if (expectedSha256Hex) {
    const hashBuffer = await subtle.digest("SHA-256", ciphertextBytes.buffer as ArrayBuffer);
    const computedHash = bufferToHex(hashBuffer);
    if (computedHash.toLowerCase() !== expectedSha256Hex.toLowerCase()) {
      throw new Error(`Integrity check failed: Expected hash ${expectedSha256Hex}, computed ${computedHash}`);
    }
  }

  // 2. Import raw AES key
  const rawKeyBuffer = base64ToArrayBuffer(keyBase64);
  const aesKey = await subtle.importKey(
    "raw",
    rawKeyBuffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );

  // 3. Decrypt file
  const ivBuffer = base64ToArrayBuffer(ivBase64);
  const decryptedBuffer = await subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
      tagLength: 128,
    },
    aesKey,
    ciphertextBytes.buffer as ArrayBuffer
  );

  return new Uint8Array(decryptedBuffer);
}
