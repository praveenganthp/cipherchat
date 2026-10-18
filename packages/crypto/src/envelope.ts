import {
  getSubtleCrypto,
  getRandomValues,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
} from "./utils.js";
import {
  generateEphemeralKeyPair,
  exportPublicKeySpki,
  importPreKeyPublic,
} from "./keys.js";
import type { EncryptedEnvelope, PlaintextMessagePayload } from "@cipherchat/shared";

const PROTOCOL_SALT = new TextEncoder().encode("cipherchat-e2ee-hkdf-salt-v1");
const PROTOCOL_INFO = new TextEncoder().encode("cipherchat-aes256gcm-key-v1");

/**
 * Derives a 256-bit AES-GCM symmetric key using ECDH + HKDF-SHA256
 */
async function deriveAesGcmKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();

  // 1. Compute ECDH raw shared bits
  const sharedBits = await subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    256
  );

  // 2. Import shared bits as HKDF base key
  const hkdfKey = await subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);

  // 3. Derive AES-GCM 256-bit key
  return subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: PROTOCOL_SALT,
      info: PROTOCOL_INFO,
    },
    hkdfKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Formats data for envelope digital signature
 */
function getEnvelopeSignatureData(
  senderDeviceId: string,
  recipientDeviceId: string,
  ephemeralPublicKey: string,
  ciphertext: string,
  iv: string,
  authTag: string,
  timestamp: number
): ArrayBuffer {
  const str = `cipherchat:sig:v1:${senderDeviceId}:${recipientDeviceId}:${ephemeralPublicKey}:${ciphertext}:${iv}:${authTag}:${timestamp}`;
  return stringToArrayBuffer(str);
}

/**
 * Encrypt a plaintext message payload for a recipient device
 */
export async function encryptEnvelope(params: {
  payload: PlaintextMessagePayload;
  recipientPreKeyPublicSpki: string;
  senderIdentityPrivateKey: CryptoKey;
  senderDeviceId: string;
  recipientDeviceId: string;
}): Promise<EncryptedEnvelope> {
  const subtle = getSubtleCrypto();

  // 1. Generate fresh ephemeral ECDH keypair for this message
  const ephemeralKeyPair = await generateEphemeralKeyPair();
  const ephemeralPublicSpki = await exportPublicKeySpki(ephemeralKeyPair.publicKey);

  // 2. Import recipient's signed prekey
  const recipientPreKey = await importPreKeyPublic(params.recipientPreKeyPublicSpki);

  // 3. Derive symmetric AES-GCM key
  const aesKey = await deriveAesGcmKey(ephemeralKeyPair.privateKey, recipientPreKey);

  // 4. Generate 96-bit (12-byte) random IV
  const ivBytes = getRandomValues(new Uint8Array(12));
  const timestamp = Date.now();

  // 5. Build Additional Authenticated Data (AAD) to bind envelope headers
  const aad = stringToArrayBuffer(`cipherchat:aad:v1:${params.senderDeviceId}:${params.recipientDeviceId}:${timestamp}`);

  // 6. Encrypt JSON string
  const plaintextBytes = stringToArrayBuffer(JSON.stringify(params.payload));
  const encryptedResult = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes.buffer as ArrayBuffer,
      additionalData: aad,
      tagLength: 128,
    },
    aesKey,
    plaintextBytes
  );

  // Web Crypto AES-GCM appends the 16-byte authentication tag to the ciphertext
  const encryptedBytes = new Uint8Array(encryptedResult);
  const tagLength = 16;
  const ciphertextLength = encryptedBytes.byteLength - tagLength;
  const ciphertextBytes = encryptedBytes.slice(0, ciphertextLength);
  const authTagBytes = encryptedBytes.slice(ciphertextLength);

  const ciphertextBase64 = arrayBufferToBase64(ciphertextBytes);
  const ivBase64 = arrayBufferToBase64(ivBytes);
  const authTagBase64 = arrayBufferToBase64(authTagBytes);

  // 7. Sign envelope with sender's identity private key
  const sigData = getEnvelopeSignatureData(
    params.senderDeviceId,
    params.recipientDeviceId,
    ephemeralPublicSpki,
    ciphertextBase64,
    ivBase64,
    authTagBase64,
    timestamp
  );

  const signatureBuffer = await subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    params.senderIdentityPrivateKey,
    sigData
  );

  return {
    version: 1,
    senderDeviceId: params.senderDeviceId,
    recipientDeviceId: params.recipientDeviceId,
    ephemeralPublicKey: ephemeralPublicSpki,
    ciphertext: ciphertextBase64,
    iv: ivBase64,
    authTag: authTagBase64,
    signature: arrayBufferToBase64(signatureBuffer),
    timestamp,
  };
}

/**
 * Decrypt an encrypted envelope using recipient's prekey private key and sender's identity public key
 */
export async function decryptEnvelope(params: {
  envelope: EncryptedEnvelope;
  recipientPreKeyPrivate: CryptoKey;
  senderIdentityPublicKey: CryptoKey;
}): Promise<PlaintextMessagePayload> {
  const subtle = getSubtleCrypto();
  const { envelope } = params;

  // 1. Verify digital signature of the envelope
  const sigData = getEnvelopeSignatureData(
    envelope.senderDeviceId,
    envelope.recipientDeviceId,
    envelope.ephemeralPublicKey,
    envelope.ciphertext,
    envelope.iv,
    envelope.authTag,
    envelope.timestamp
  );

  let isSignatureValid = await subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    params.senderIdentityPublicKey,
    base64ToArrayBuffer(envelope.signature),
    sigData
  );

  if (!isSignatureValid) {
    const fallbackSigData = stringToArrayBuffer(
      `cipherchat:sig:v1:${envelope.senderDeviceId}:${envelope.recipientDeviceId}:${envelope.ephemeralPublicKey}:${envelope.ciphertext}:${envelope.iv}:${envelope.authTag}`
    );
    isSignatureValid = await subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      params.senderIdentityPublicKey,
      base64ToArrayBuffer(envelope.signature),
      fallbackSigData
    );
  }

  if (!isSignatureValid) {
    throw new Error("Cryptographic verification failed: Invalid envelope signature or tampered message.");
  }

  // 2. Import ephemeral public key
  const ephemeralPublicKey = await importPreKeyPublic(envelope.ephemeralPublicKey);

  // 3. Derive symmetric AES-GCM key
  const aesKey = await deriveAesGcmKey(params.recipientPreKeyPrivate, ephemeralPublicKey);

  // 4. Combine ciphertext + authTag for Web Crypto subtle decrypt
  const ciphertextBytes = new Uint8Array(base64ToArrayBuffer(envelope.ciphertext));
  const authTagBytes = new Uint8Array(base64ToArrayBuffer(envelope.authTag));
  const fullEncryptedBytes = new Uint8Array(ciphertextBytes.byteLength + authTagBytes.byteLength);
  fullEncryptedBytes.set(ciphertextBytes, 0);
  fullEncryptedBytes.set(authTagBytes, ciphertextBytes.byteLength);

  // 5. Reconstruct AAD & Decrypt
  const ivBytes = base64ToArrayBuffer(envelope.iv);

  if (envelope.timestamp) {
    try {
      const aad = stringToArrayBuffer(
        `cipherchat:aad:v1:${envelope.senderDeviceId}:${envelope.recipientDeviceId}:${envelope.timestamp}`
      );
      const decryptedBuffer = await subtle.decrypt(
        {
          name: "AES-GCM",
          iv: ivBytes,
          additionalData: aad,
          tagLength: 128,
        },
        aesKey,
        fullEncryptedBytes
      );

      const jsonString = arrayBufferToString(decryptedBuffer);
      return JSON.parse(jsonString) as PlaintextMessagePayload;
    } catch {
      // Continue to try fallback AAD
    }
  }

  try {
    const aadWithoutTs = stringToArrayBuffer(
      `cipherchat:aad:v1:${envelope.senderDeviceId}:${envelope.recipientDeviceId}`
    );
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes,
        additionalData: aadWithoutTs,
        tagLength: 128,
      },
      aesKey,
      fullEncryptedBytes
    );

    const jsonString = arrayBufferToString(decryptedBuffer);
    return JSON.parse(jsonString) as PlaintextMessagePayload;
  } catch (err) {
    throw new Error(`Decryption failed: Ciphertext or authentication tag has been tampered with or corrupted. ${(err as Error).message}`);
  }
}
