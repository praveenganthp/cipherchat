import { z } from "zod";

/**
 * Standard encrypted message envelope format.
 * The payload is AES-256-GCM encrypted.
 * Authentication tag and IV are included.
 * No plaintext is visible to the server.
 */
export const EncryptedEnvelopeSchema = z.object({
  version: z.literal(1).default(1),
  senderDeviceId: z.string().uuid(),
  recipientDeviceId: z.string().uuid(),
  ephemeralPublicKey: z.string().min(32), // Base64 SPKI ECDH P-256 public key
  ciphertext: z.string().min(1),         // Base64 encrypted payload
  iv: z.string().min(12),                 // Base64 96-bit IV
  authTag: z.string().min(16),            // Base64 128-bit authentication tag
  signature: z.string().min(32),          // Base64 ECDSA signature over envelope content
  timestamp: z.number().int().positive(),
});

export type EncryptedEnvelope = z.infer<typeof EncryptedEnvelopeSchema>;

/**
 * Inner decrypted payload structure before client-side encryption.
 */
export const PlaintextMessagePayloadSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  content: z.string(),
  type: z.enum(["TEXT", "ATTACHMENT", "SYSTEM"]).default("TEXT"),
  replyToMessageId: z.string().uuid().optional(),
  reactions: z.record(z.array(z.string())).optional(),
  attachment: z
    .object({
      id: z.string().uuid(),
      storageKey: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number().int().positive(),
      encryptionKey: z.string(), // Base64 AES-256 key for the file
      iv: z.string(),            // Base64 IV
      sha256Checksum: z.string(),
    })
    .optional(),
});

export type PlaintextMessagePayload = z.infer<typeof PlaintextMessagePayloadSchema>;

/**
 * Public key bundle for a device
 */
export interface DeviceKeyBundle {
  userId: string;
  deviceId: string;
  identityPublicKey: string; // Base64 SPKI ECDSA P-256
  signedPreKey: string;      // Base64 SPKI ECDH P-256
  preKeySignature: string;   // Base64 ECDSA signature of signedPreKey
}

/**
 * Safety number calculation metadata
 */
export interface SafetyFingerprint {
  fingerprint: string;       // e.g. "49201 58201 92841 ..." (12 blocks of 5 digits)
  numericBlocks: string[];   // Array of 12 blocks
  hex: string;               // 64-character SHA-256 hex string
  verified: boolean;
}
