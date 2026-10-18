# CipherChat Cryptographic Design & Architecture

## 1. Executive Summary

CipherChat is designed around the fundamental principle of **Zero-Knowledge Message Secrecy**: the server and network transit providers must never possess the cryptographic keys or capability to decrypt messages, access plaintext bodies, or inspect media attachments.

This document formalizes the cryptographic primitives, key distribution mechanisms, envelope structure, forward secrecy, group messaging ratchet, attachment encryption, and safety verification protocols.

---

## 2. Cryptographic Primitives

CipherChat relies on standardized, hardware-accelerated, constant-time primitives provided by the **W3C Web Crypto API** (`SubtleCrypto` in modern browsers and `node:crypto.webcrypto` in Node.js):

| Function | Primitive | Standard | Parameters / Key Size |
|---|---|---|---|
| **Device Identity & Signing** | ECDSA | FIPS 186-4 | NIST P-256 (secp256r1) with SHA-256 |
| **Key Agreement (Diffie-Hellman)** | ECDH | NIST SP 800-56A | NIST P-256 (secp256r1) |
| **Key Derivation** | HKDF | RFC 5869 | HKDF-SHA-256 with domain-separated salt & info |
| **Symmetric Message Encryption** | AES-GCM | NIST SP 800-38D | 256-bit key, 96-bit random IV, 128-bit authentication tag |
| **Integrity & Fingerprints** | SHA-256 | FIPS 180-4 | 256-bit digest |

---

## 3. Key Hierarchy & Lifecycle

### 3.1 Device Identity Key (`IK`)
- **Type**: ECDSA P-256 Key Pair.
- **Generation**: Created client-side during device onboarding.
- **Persistence**: Private key stored in IndexedDB with non-extractable / user-isolated storage.
- **Public Key**: Uploaded to the server in Base64 SPKI format.
- **Purpose**: Authenticates the device identity, signs PreKeys, and signs outbound message envelopes to prevent impersonation and man-in-the-middle attacks.

### 3.2 Signed PreKey (`SPK`)
- **Type**: ECDH P-256 Key Pair.
- **Purpose**: Enables asynchronous key agreement when the recipient device is offline.
- **Attestation**: Signed by the device's Identity Private Key (`IK_priv`) with SHA-256. The server distributes `SPK_pub` alongside the signature so peers can verify key authenticity before initiating a conversation.
- **Rotation**: Rotated periodically (e.g., every 30 days) to limit key reuse.

### 3.3 Ephemeral Key (`EK`)
- **Type**: Fresh ECDH P-256 Key Pair generated per message.
- **Purpose**: Guarantees forward secrecy: even if an identity key is compromised in the future, past ephemeral keys cannot be retroactively derived.

---

## 4. Message Encryption Protocol (Direct Messaging)

### Step 1: Key Derivation
When Sender $A$ (device $D_A$) sends a message to Recipient $B$ (device $D_B$):
1. $A$ fetches $B$'s verified Signed PreKey $\text{SPK}_B$ from the server.
2. $A$ verifies $B$'s prekey signature against $B$'s Identity Key $\text{IK}_B$.
3. $A$ generates a fresh ephemeral key pair $(\text{EK}_{A,\text{priv}}, \text{EK}_{A,\text{pub}})$.
4. $A$ performs ECDH between $\text{EK}_{A,\text{priv}}$ and $\text{SPK}_B$:
   $$S = \text{ECDH}(\text{EK}_{A,\text{priv}}, \text{SPK}_B)$$
5. $A$ derives the 256-bit AES-GCM message encryption key $K_{\text{msg}}$ using HKDF:
   $$K_{\text{msg}} = \text{HKDF-SHA256}(S, \text{salt}=\text{"cipherchat-e2ee-hkdf-salt-v1"}, \text{info}=\text{"cipherchat-aes256gcm-key-v1"})$$

### Step 2: Authenticated Encryption (AES-256-GCM)
1. $A$ generates a cryptographically secure 96-bit random IV:
   $$\text{IV} \leftarrow \text{CSPRNG}(12 \text{ bytes})$$
2. $A$ constructs Additional Authenticated Data (AAD) binding the envelope metadata to the ciphertext:
   $$\text{AAD} = \text{"cipherchat:aad:v1:"} \parallel D_A \parallel \text{":"} \parallel D_B \parallel \text{":"} \parallel \text{timestamp}$$
3. $A$ encrypts the JSON plaintext with AES-256-GCM:
   $$(\text{Ciphertext}, \text{AuthTag}) = \text{AES-256-GCM-Encrypt}(K_{\text{msg}}, \text{IV}, \text{AAD}, \text{Plaintext})$$

### Step 3: Envelope Signing
$A$ signs the envelope metadata and ciphertext using $D_A$'s Identity Private Key:
$$\text{Sig} = \text{ECDSA-Sign}(\text{IK}_{A,\text{priv}}, \text{Hash}(\text{"cipherchat:sig:v1:"} \parallel D_A \parallel D_B \parallel \text{EK}_{A,\text{pub}} \parallel \text{Ciphertext} \parallel \text{IV} \parallel \text{AuthTag} \parallel \text{timestamp}))$$

### Step 4: Transmission & Decryption
1. The server receives only the opaque encrypted envelope. The server cannot decrypt the content because it lacks $\text{EK}_{A,\text{priv}}$ and $\text{SPK}_{B,\text{priv}}$.
2. Upon receipt, $B$ verifies $\text{Sig}$ using $A$'s $\text{IK}_{A,\text{pub}}$.
3. $B$ derives $K_{\text{msg}}$ via $\text{ECDH}(\text{SPK}_{B,\text{priv}}, \text{EK}_{A,\text{pub}})$.
4. $B$ decrypts the ciphertext using $K_{\text{msg}}$, $\text{IV}$, and $\text{AAD}$. If any bit was modified in transit, AES-GCM tag verification throws an integrity fault.

---

## 5. Group Messaging Cryptographic Model

Group messaging uses a multi-recipient envelope model:
1. Sender generates a single random 256-bit symmetric message key $K_{\text{group\_msg}}$.
2. The payload is encrypted once with $K_{\text{group\_msg}}$ via AES-256-GCM.
3. For each active member device in the room, $K_{\text{group\_msg}}$ is wrapped using pairwise ECDH with that member device's Signed PreKey.
4. **Key Rotation upon Member Departure**:
   When a user leaves or is removed from a private room, the room's epoch counter is incremented on the server. Future messages must be encrypted only for the remaining active members. The removed member will not receive wrapped keys for subsequent messages, guaranteeing post-departure secrecy.

---

## 6. Zero-Knowledge Attachment Encryption

1. **Client-side Encryption**:
   - The sender generates a random 256-bit AES-GCM file key $K_{\text{file}}$ and 96-bit $\text{IV}_{\text{file}}$.
   - The file is encrypted entirely in the browser before upload.
   - A SHA-256 checksum of the ciphertext blob is calculated.
2. **Encrypted Blob Storage**:
   - The ciphertext blob is uploaded to object storage via a short-lived signed upload intent.
   - The server stores only the raw ciphertext blob and metadata (size, MIME type, SHA-256 checksum).
3. **Key Distribution**:
   - $K_{\text{file}}$, $\text{IV}_{\text{file}}$, and the SHA-256 checksum are bundled inside the end-to-end encrypted message payload, delivered only to authorized recipients.
4. **Decryption**:
   - The recipient downloads the encrypted blob, verifies the SHA-256 checksum, and decrypts locally using $K_{\text{file}}$.

---

## 7. Safety Numbers & Key Verification

To prevent Man-In-The-Middle (MITM) attacks and detect unexpected key changes (such as device reassignment or server-side key tampering), CipherChat computes a **Safety Fingerprint** for every contact:

$$\text{Digest} = \text{SHA-256}(\text{"cipherchat:safetynumber:v1:"} \parallel \min(\text{IK}_A, \text{IK}_B) \parallel \text{":"} \parallel \max(\text{IK}_A, \text{IK}_B))$$

The digest is formatted into:
- 12 blocks of 5 decimal digits (60 digits total), formatted for user-friendly voice/in-person comparison:
  `49201 58201 92841 01928 47291 03847 29481 02938 48192 04829 10492 83748`
- A 64-character hexadecimal fingerprint.
- If a contact's public key changes, the safety number changes automatically and the application alerts the user of a key identity mismatch.
