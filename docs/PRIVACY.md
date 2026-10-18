# CipherChat Privacy Architecture & Data Minimization

## 1. Privacy Principles

CipherChat is engineered in compliance with **Privacy by Design** principles:

1. **End-to-End Encryption by Default**: All one-to-one and group messages, replies, reactions, and attachments are encrypted before leaving the client device. Plaintext is never accessible to CipherChat infrastructure.
2. **Metadata Minimization**: We only collect the minimal metadata necessary to route messages, maintain room membership, and enforce abuse prevention limits.
3. **No Third-Party Trackers**: CipherChat includes zero commercial advertising SDKs, zero behavioral tracking pixels, and zero third-party analytics scripts.
4. **Transparent Data Lifecycle**: Ephemeral and disappearing messages are automatically purged from the server database upon reaching expiration or their maximum allowed view count.
5. **Full Data Portability and Deletion**: Users have complete rights to revoke devices, export their public identity keys, and permanently delete their accounts and associated metadata.

---

## 2. Data Categorization

### 2.1 Content Data (Zero-Knowledge)
- **Status**: Completely inaccessible to the server.
- **Includes**: Message text, emojis, replies, reactions, file contents, image bytes, video streams.
- **Protection**: AES-256-GCM symmetric encryption with keys held exclusively on participant devices.

### 2.2 Operational Metadata (Minimally Retained)
- **User Profile**: Username, display name, optional avatar URL, hashed account password.
- **Device Public Keys**: Public identity keys (ECDSA P-256 SPKI), signed prekeys (ECDH P-256 SPKI), and prekey signatures.
- **Membership Graph**: List of conversation IDs and member user IDs to route messages and enforce authorization.
- **Delivery Status**: Timestamps of message transmission and delivery.
- **Connection Diagnostics**: Transient IP addresses for rate limiting and fraud prevention, retained in volatile memory logs with rapid rotation.

---

## 3. Disappearing & Limited-View Policy Enforcement

CipherChat supports four privacy policies for ephemeral content:

| Policy | Server Action | Client Behavior |
|---|---|---|
| **View Once** | Server atomically marks message as expired upon first authorized view request. Subsequent requests are rejected with HTTP 410 Gone. Encrypted blob scheduled for immediate deletion. | Rendered once in the viewer modal; decrypted buffer cleared from memory upon dismissal. |
| **View Twice** | Server atomically increments view count; marks message as expired upon second view. | Interface displays remaining view badge (e.g. `1/2 views left`); decrypted buffer destroyed upon closing modal. |
| **Time-to-Live (TTL)** | Server marks message expired when `Date.now() > expiresAt`. Periodic background job sweeps and deletes records. | Client hides expired messages from conversation timeline. |
| **Standard Retention** | Stored until explicitly deleted by room admin or conversation participants. | Stored in local encrypted IndexedDB cache. |

---

## 4. User Controls & Privacy Settings

CipherChat empowers users with granular privacy controls:
- **Read Receipts**: Can be disabled to prevent contacts from knowing when you have opened a message.
- **Typing Indicators**: Can be disabled to prevent real-time typing events from being broadcast.
- **Presence Visibility**: Configurable between `Everyone`, `Contacts Only`, and `Nobody`.
- **Device Revocation**: Revoking a device immediately invalidates its sessions and public keys, preventing it from receiving future messages.
