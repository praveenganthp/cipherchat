# CipherChat Threat Model

## 1. Security Objectives & Assets

The primary security objective of CipherChat is to provide **confidentiality**, **integrity**, and **authenticity** for all interpersonal and group communications while minimizing the amount of metadata processed by the system.

### Assets to Protect:
1. **Message Plaintext**: Text, emojis, reactions, replies, and attachments exchanged between users.
2. **Private Cryptographic Keys**: User identity private keys (`IK_priv`) and prekey private keys (`SPK_priv`).
3. **Authentication Credentials**: User passwords, session tokens, and refresh tokens.
4. **Group Membership Integrity**: Authoritative tracking of room membership, preventing unauthorized access or eavesdropping.
5. **View-Count Policies**: Enforcing strict one-view and two-view restrictions on ephemeral messages and attachments.

---

## 2. Adversary Model & Assumptions

We evaluate security against the following adversary profiles:

### 2.1 Malicious or Compromised Server Operator (Untrusted Infrastructure)
- **Capability**: Has full read/write access to the PostgreSQL database, file storage, WebSocket connection server, and API gateways. Can inspect, drop, or alter database records; can log all HTTP headers, IP addresses, and encrypted envelopes.
- **Defense in CipherChat**:
  - The server only ever observes opaque ciphertext envelopes, Base64 IVs, authentication tags, and public keys.
  - Plaintext is encrypted on the client using keys never transmitted to or accessible by the server.
  - Ephemeral ECDH key agreement provides forward secrecy.
  - Modifying envelopes in the database causes AES-GCM authentication failure on the recipient's device.
  - Replacing public keys is detectable via the out-of-band Safety Fingerprint verification.

### 2.2 Passive Network Eavesdropper (ISP / Public Wi-Fi / Middleboxes)
- **Capability**: Can capture all network packets between client and server.
- **Defense in CipherChat**:
  - All transport traffic is encrypted with TLS 1.3 (HTTPS) and Secure WebSockets (WSS).
  - Even if TLS were hypothetically terminated or stripped, the inner message payloads and attachment blobs are independently end-to-end encrypted with AES-256-GCM.

### 2.3 Active Network Attacker (Man-In-The-Middle / DNS Hijacker)
- **Capability**: Can intercept, inject, replay, or alter packets.
- **Defense in CipherChat**:
  - Strict Content Security Policy (CSP), HSTS, and origin validation.
  - All envelopes are digitally signed with the sender's ECDSA identity key; replay attacks are rejected by timestamp bounds and unique message IDs.
  - Mutual key attestation via Signed PreKeys and Safety Fingerprints.

### 2.4 Revoked Device or Former Group Member
- **Capability**: An unauthorized user possesses a previously used device or was removed from a private group.
- **Defense in CipherChat**:
  - Device revocation permanently marks the device public key as invalid in the registry and terminates all active sessions.
  - When a group member leaves or is removed, the group key is rotated for all future messages (post-departure secrecy).

---

## 3. Threat Matrix & Mitigations

| Threat | Impact | Mitigation Strategy |
|---|---|---|
| **Server-Side Plaintext Snooping** | Critical | Client-side E2EE with ECDH + AES-256-GCM. Server never receives private keys. |
| **Tampered Ciphertext in Database** | High | AES-GCM 128-bit authentication tag + ECDSA digital signature over envelope. |
| **Replay of Encrypted Messages** | Medium | Timestamp bounds validation, unique client UUIDs, and database uniqueness constraints. |
| **Concurrent View-Limit Bypass** | High | Atomic database transaction (`UPDATE ... SET viewCount = viewCount + 1 WHERE id = ... AND viewCount < maxViews RETURNING ...`). |
| **Stale Attachment Persistence** | Medium | Automated background cleanup jobs purging expired encrypted blobs and metadata. |
| **Brute-Force Login / Registration** | High | Strong Argon2 / Bcrypt password hashing + Fastify rate-limiting on auth routes. |
| **XSS Key Extraction** | Critical | Strict CSP headers, no `eval`, sanitization of rich text, non-extractable keys in IndexedDB. |

---

## 4. Known Limitations & Out-of-Scope Risks

1. **Endpoint Compromise**: If an attacker gains administrative or malware control over a user's physical device or browser memory, they can read decrypted messages displayed on screen or capture keystrokes.
2. **Metadata Leakage**: While message content is confidential, the server can observe traffic metadata: account identifiers, conversation membership, timestamps, IP addresses, and message sizes.
3. **Screen Capture & Physical Recording**: View-once and view-twice limits enforce atomic server delivery constraints, but cannot physically prevent a recipient from taking a photo of their screen with another camera or device.
