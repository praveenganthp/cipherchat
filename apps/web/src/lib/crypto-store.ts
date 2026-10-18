import {
  generateIdentityKeyPair,
  generatePreKeyPair,
  signPreKey,
  importIdentityPrivateKey,
  importIdentityPublicKey,
  importPreKeyPrivate,
  computeSafetyFingerprint,
  encryptEnvelope,
  decryptEnvelope,
  type SerializedKeyPair,
} from "@cipherchat/crypto";
import type { PlaintextMessagePayload, EncryptedEnvelope, SafetyFingerprint } from "@cipherchat/shared";

const STORAGE_KEY = "cipherchat_device_crypto_v1";

export interface StoredCryptoKeys {
  identityKeys: SerializedKeyPair;
  preKeys: SerializedKeyPair;
  preKeySignature: string;
  fingerprint: string;
}

export class DeviceCryptoManager {
  private static instance: DeviceCryptoManager | null = null;
  private memoryCache: StoredCryptoKeys | null = null;

  public static getInstance(): DeviceCryptoManager {
    if (!DeviceCryptoManager.instance) {
      DeviceCryptoManager.instance = new DeviceCryptoManager();
    }
    return DeviceCryptoManager.instance;
  }

  /**
   * Initializes or loads device cryptographic material
   */
  public async getOrInitializeKeys(): Promise<StoredCryptoKeys> {
    if (this.memoryCache) {
      return this.memoryCache;
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.memoryCache = JSON.parse(stored);
          return this.memoryCache!;
        } catch {
          // If corrupted, reinitialize
        }
      }
    }

    // Generate fresh cryptographic keys
    const identity = await generateIdentityKeyPair();
    const prekey = await generatePreKeyPair();
    const preKeySignature = await signPreKey(
      identity.keyPair.privateKey,
      prekey.serialized.publicKey
    );

    const safety = await computeSafetyFingerprint(
      identity.serialized.publicKey,
      identity.serialized.publicKey
    );

    const keys: StoredCryptoKeys = {
      identityKeys: identity.serialized,
      preKeys: prekey.serialized,
      preKeySignature,
      fingerprint: safety.fingerprint,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    }

    this.memoryCache = keys;
    return keys;
  }

  /**
   * Encrypt a message payload for a recipient device
   */
  public async encryptMessage(params: {
    payload: PlaintextMessagePayload;
    recipientPreKeyPublicSpki: string;
    senderDeviceId: string;
    recipientDeviceId: string;
  }): Promise<EncryptedEnvelope> {
    const keys = await this.getOrInitializeKeys();
    const senderIdentityPrivateKey = await importIdentityPrivateKey(keys.identityKeys.privateKey);

    return encryptEnvelope({
      payload: params.payload,
      recipientPreKeyPublicSpki: params.recipientPreKeyPublicSpki,
      senderIdentityPrivateKey,
      senderDeviceId: params.senderDeviceId,
      recipientDeviceId: params.recipientDeviceId,
    });
  }

  /**
   * Decrypt an inbound encrypted envelope
   */
  public async decryptMessage(params: {
    envelope: EncryptedEnvelope;
    senderIdentityPublicKeySpki: string;
  }): Promise<PlaintextMessagePayload> {
    const keys = await this.getOrInitializeKeys();
    const recipientPreKeyPrivate = await importPreKeyPrivate(keys.preKeys.privateKey);
    const senderIdentityPublicKey = await importIdentityPublicKey(params.senderIdentityPublicKeySpki);

    return decryptEnvelope({
      envelope: params.envelope,
      recipientPreKeyPrivate,
      senderIdentityPublicKey,
    });
  }

  /**
   * Compute mutual safety number with another user
   */
  public async getSafetyNumber(otherIdentityPublicKeySpki: string): Promise<SafetyFingerprint> {
    const keys = await this.getOrInitializeKeys();
    return computeSafetyFingerprint(keys.identityKeys.publicKey, otherIdentityPublicKeySpki);
  }

  /**
   * Clear local encryption keys (upon device wipe or logout)
   */
  public clearKeys() {
    this.memoryCache = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const cryptoManager = DeviceCryptoManager.getInstance();
