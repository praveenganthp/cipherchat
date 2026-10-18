import { describe, it, expect } from "vitest";
import {
  generateIdentityKeyPair,
  generatePreKeyPair,
  signPreKey,
  verifyPreKeySignature,
  importIdentityPublicKey,
  importIdentityPrivateKey,
  importPreKeyPrivate,
} from "../keys.js";
import { encryptEnvelope, decryptEnvelope } from "../envelope.js";
import { encryptFileBuffer, decryptFileBuffer } from "../attachments.js";
import { computeSafetyFingerprint } from "../safety.js";
import type { PlaintextMessagePayload } from "@cipherchat/shared";

describe("CipherChat Cryptographic Engine", () => {
  it("should generate identity and prekey pairs, sign and verify prekeys", async () => {
    const aliceIdentity = await generateIdentityKeyPair();
    const alicePreKey = await generatePreKeyPair();

    const signature = await signPreKey(
      aliceIdentity.keyPair.privateKey,
      alicePreKey.serialized.publicKey
    );

    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(20);

    const isValid = await verifyPreKeySignature(
      aliceIdentity.keyPair.publicKey,
      alicePreKey.serialized.publicKey,
      signature
    );

    expect(isValid).toBe(true);

    const isInvalid = await verifyPreKeySignature(
      aliceIdentity.keyPair.publicKey,
      "corrupted-spki-key-payload",
      signature
    );
    expect(isInvalid).toBe(false);
  });

  it("should encrypt and decrypt a message payload between Alice and Bob", async () => {
    // 1. Setup Alice (Sender)
    const aliceIdentity = await generateIdentityKeyPair();
    const aliceDeviceId = "00000000-0000-0000-0000-000000000001";

    // 2. Setup Bob (Recipient)
    const bobIdentity = await generateIdentityKeyPair();
    const bobPreKey = await generatePreKeyPair();
    const bobDeviceId = "00000000-0000-0000-0000-000000000002";

    const payload: PlaintextMessagePayload = {
      id: "11111111-1111-1111-1111-111111111111",
      conversationId: "22222222-2222-2222-2222-222222222222",
      senderId: "33333333-3333-3333-3333-333333333333",
      timestamp: Date.now(),
      content: "Hello Bob, this message is end-to-end encrypted with AES-256-GCM!",
      type: "TEXT",
    };

    // 3. Alice encrypts envelope for Bob
    const envelope = await encryptEnvelope({
      payload,
      recipientPreKeyPublicSpki: bobPreKey.serialized.publicKey,
      senderIdentityPrivateKey: aliceIdentity.keyPair.privateKey,
      senderDeviceId: aliceDeviceId,
      recipientDeviceId: bobDeviceId,
    });

    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.authTag).toBeDefined();
    expect(envelope.iv).toBeDefined();
    expect(envelope.signature).toBeDefined();

    // Plaintext should NOT appear in envelope!
    expect(envelope.ciphertext).not.toContain("Hello Bob");

    // 4. Bob decrypts envelope
    const bobPreKeyPrivate = await importPreKeyPrivate(bobPreKey.serialized.privateKey);
    const aliceIdentityPublic = await importIdentityPublicKey(aliceIdentity.serialized.publicKey);

    const decrypted = await decryptEnvelope({
      envelope,
      recipientPreKeyPrivate: bobPreKeyPrivate,
      senderIdentityPublicKey: aliceIdentityPublic,
    });

    expect(decrypted.id).toBe(payload.id);
    expect(decrypted.content).toBe(payload.content);
    expect(decrypted.conversationId).toBe(payload.conversationId);
  });

  it("should fail decryption when ciphertext is tampered with", async () => {
    const aliceIdentity = await generateIdentityKeyPair();
    const aliceDeviceId = "00000000-0000-0000-0000-000000000001";
    const bobPreKey = await generatePreKeyPair();
    const bobDeviceId = "00000000-0000-0000-0000-000000000002";

    const payload: PlaintextMessagePayload = {
      id: "11111111-1111-1111-1111-111111111111",
      conversationId: "22222222-2222-2222-2222-222222222222",
      senderId: "33333333-3333-3333-3333-333333333333",
      timestamp: Date.now(),
      content: "Tamper test",
      type: "TEXT",
    };

    const envelope = await encryptEnvelope({
      payload,
      recipientPreKeyPublicSpki: bobPreKey.serialized.publicKey,
      senderIdentityPrivateKey: aliceIdentity.keyPair.privateKey,
      senderDeviceId: aliceDeviceId,
      recipientDeviceId: bobDeviceId,
    });

    // Tamper with ciphertext by altering a base64 character
    const tamperedCiphertext =
      envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.endsWith("A") ? "B" : "A");

    const tamperedEnvelope = {
      ...envelope,
      ciphertext: tamperedCiphertext,
    };

    const bobPreKeyPrivate = await importPreKeyPrivate(bobPreKey.serialized.privateKey);
    const aliceIdentityPublic = await importIdentityPublicKey(aliceIdentity.serialized.publicKey);

    await expect(
      decryptEnvelope({
        envelope: tamperedEnvelope,
        recipientPreKeyPrivate: bobPreKeyPrivate,
        senderIdentityPublicKey: aliceIdentityPublic,
      })
    ).rejects.toThrow();
  });

  it("should encrypt and decrypt attachments locally, verifying SHA-256 integrity", async () => {
    const originalFileBytes = new TextEncoder().encode("CONFIDENTIAL ATTACHMENT DATA BLOB 2026");

    const encrypted = await encryptFileBuffer(originalFileBytes);
    expect(encrypted.ciphertextBytes.byteLength).toBeGreaterThan(originalFileBytes.byteLength);
    expect(encrypted.sha256Hex).toHaveLength(64);

    // Decrypt with correct key and checksum
    const decryptedBytes = await decryptFileBuffer(
      encrypted.ciphertextBytes,
      encrypted.keyBase64,
      encrypted.ivBase64,
      encrypted.sha256Hex
    );

    const decryptedText = new TextDecoder().decode(decryptedBytes);
    expect(decryptedText).toBe("CONFIDENTIAL ATTACHMENT DATA BLOB 2026");

    // Decrypt should fail if checksum doesn't match
    await expect(
      decryptFileBuffer(
        encrypted.ciphertextBytes,
        encrypted.keyBase64,
        encrypted.ivBase64,
        "0000000000000000000000000000000000000000000000000000000000000000"
      )
    ).rejects.toThrow(/Integrity check failed/);
  });

  it("should compute symmetric safety numbers regardless of user ordering", async () => {
    const aliceIdentity = await generateIdentityKeyPair();
    const bobIdentity = await generateIdentityKeyPair();

    const fingerprintAlice = await computeSafetyFingerprint(
      aliceIdentity.serialized.publicKey,
      bobIdentity.serialized.publicKey
    );

    const fingerprintBob = await computeSafetyFingerprint(
      bobIdentity.serialized.publicKey,
      aliceIdentity.serialized.publicKey
    );

    expect(fingerprintAlice.fingerprint).toBe(fingerprintBob.fingerprint);
    expect(fingerprintAlice.numericBlocks.length).toBe(12);
    expect(fingerprintAlice.hex).toBe(fingerprintBob.hex);
  });
});
