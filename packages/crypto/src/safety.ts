import { getSubtleCrypto, bufferToHex, stringToArrayBuffer } from "./utils.js";
import type { SafetyFingerprint } from "@cipherchat/shared";

/**
 * Computes deterministic safety number / verification fingerprint between two users' identity keys.
 * Matches Signal-style safety numbers: 12 blocks of 5 digits (60 decimal digits).
 */
export async function computeSafetyFingerprint(
  identityKeyA: string,
  identityKeyB: string
): Promise<SafetyFingerprint> {
  const subtle = getSubtleCrypto();

  // 1. Sort keys lexicographically so both parties generate identical fingerprints
  const [firstKey, secondKey] = [identityKeyA, identityKeyB].sort();

  // 2. Compute master digest of sorted keys
  const combined = `cipherchat:safetynumber:v1:${firstKey}:${secondKey}`;
  const digestBuffer = await subtle.digest("SHA-256", stringToArrayBuffer(combined));
  const hex = bufferToHex(digestBuffer);

  // 3. Generate 12 blocks of 5 digits using iterative SHA-256
  const blocks: string[] = [];
  const bytes = new Uint8Array(digestBuffer);

  for (let i = 0; i < 12; i++) {
    // Take 4 bytes for each block to form an integer
    const offset = (i * 2) % (bytes.length - 4);
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    const val = view.getUint32(0, false);
    const fiveDigits = (val % 100000).toString().padStart(5, "0");
    blocks.push(fiveDigits);
  }

  const fingerprint = blocks.join(" ");

  return {
    fingerprint,
    numericBlocks: blocks,
    hex,
    verified: false,
  };
}
