# CipherChat 🔒

> **Privacy-First, End-to-End Encrypted Real-Time Messaging Platform**

[![CI](https://github.com/cipherchat/cipherchat/actions/workflows/ci.yml/badge.svg)](https://github.com/cipherchat/cipherchat/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Web Crypto](https://img.shields.io/badge/Cryptography-W3C_Web_Crypto-emerald.svg)](https://w3c.github.io/webcrypto/)
[![Fastify](https://img.shields.io/badge/Backend-Fastify_v5-000000.svg)](https://www.fastify.io/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_15-black.svg)](https://nextjs.org/)

CipherChat is a production-minded, open-source real-time messaging application engineered with **Zero-Knowledge Architecture**. Message payloads, replies, reactions, and attachments are encrypted on client devices using standard hardware-accelerated **W3C Web Crypto** primitives (ECDH P-256 and AES-256-GCM) before transmission over secure WebSockets. The server never observes plaintext, unencrypted file blobs, or private keys.

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Clients["Authorized Client Devices"]
        Alice["Alice (Browser / Device A)<br/>Web Crypto: ECDSA / ECDH P-256<br/>AES-256-GCM"]
        Bob["Bob (Browser / Device B)<br/>Web Crypto: ECDSA / ECDH P-256<br/>AES-256-GCM"]
    end

    subgraph Edge["Network Transport & Edge (Netlify)"]
        WebHosting["Netlify Hosting<br/>Next.js 15 App Router<br/>Static Assets & RSC"]
    end

    subgraph Backend["CipherChat Backend Service (Fastify)"]
        API["Fastify 5 REST API<br/>Auth / Devices / Rooms / Envelopes"]
        WS["WebSocket Gateway (/ws)<br/>Real-Time Routing & Presence"]
        Atomic["Atomic View Manager<br/>One-View & Two-View Enforcement"]
        CleanupWorker["Background Job<br/>Sweeps Expired TTL Messages"]
    end

    subgraph Storage["Persistent Storage"]
        Postgres[("PostgreSQL 15+ (Prisma ORM)<br/>Opaque Ciphertext Envelopes<br/>Public Key Bundles & Metadata")]
        BlobStore[("Private Blob Storage<br/>Encrypted Ciphertext Blobs Only")]
    end

    Alice <-->|HTTPS / WSS| WebHosting
    Bob <-->|HTTPS / WSS| WebHosting
    Alice <==>|"E2EE Envelopes (AES-GCM)"| WS
    Bob <==>|"E2EE Envelopes (AES-GCM)"| WS

    Alice -->|Upload Encrypted Blob| API
    Bob -->|Download Encrypted Blob| API

    API --> Postgres
    WS --> Postgres
    Atomic --> Postgres
    CleanupWorker --> Postgres
    API --> BlobStore
```

---

## Feature Matrix

- [x] **End-to-End Encryption**: Zero-knowledge client-side encryption using NIST P-256 (secp256r1), HKDF-SHA256, and AES-256-GCM with 96-bit random IVs and 128-bit authentication tags.
- [x] **Forward Secrecy**: Per-message ephemeral ECDH key agreement. Compromise of long-term identity keys cannot retroactively decrypt past conversations.
- [x] **Signed PreKeys & Device Identities**: Asynchronous key agreement without requiring both parties online simultaneously, signed with device ECDSA identity keys.
- [x] **Contact Safety Numbers**: 12 blocks of 5 decimal digits (Signal-style 60-digit verification code) to verify contact keys out-of-band and detect Man-In-The-Middle attacks.
- [x] **Real-Time WebSockets**: Persistent `@fastify/websocket` server supporting instant message delivery, typing indicators, presence, and delivery confirmations.
- [x] **View-Once & View-Twice Media**: Atomic database transactions enforce exact view count limits (`viewCount < maxViews`). Subsequent access is rejected with HTTP 410 Gone.
- [x] **Disappearing Messages**: Configurable room-level and message-level Time-To-Live (TTL) with an automated server-side cleanup worker.
- [x] **Zero-Knowledge Attachments**: Files are encrypted with random 256-bit symmetric keys client-side before upload. The server only stores ciphertext blobs.
- [x] **Multi-Device & Revocation**: Multiple devices per user account with individual cryptographic identities; revoke any device instantly.
- [x] **Private Rooms & Groups**: Create encrypted rooms with invite links, usage limits, expirations, and administrative roles (Owner, Admin, Member).
- [x] **Granular Privacy Controls**: Disable read receipts, toggle typing indicators, or switch presence visibility (Everyone, Contacts Only, Nobody).
- [x] **Explicit Demo Mode**: Easily explore features with realistic offline sample fixtures without needing live credentials.
- [x] **IME-Safe Chat Input**: Chat input accounts for Input Method Editor (IME) text composition in Japanese, Chinese, and Korean with Safari event-ordering fallbacks.

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript | High-performance React Server Components, streaming, and fast client routing. |
| **Styling** | Tailwind CSS & shadcn/ui principles | Dark navy theme (`#0B1120`), refined typography, restrained animations. |
| **State & Data** | TanStack Query v5, Zustand, React Hook Form, Zod | Server cache synchronization, client state, strict schema validation. |
| **Cryptography** | W3C Web Crypto API (`SubtleCrypto`) | Built-in, hardware-accelerated, constant-time, zero external dependencies. |
| **Backend** | Node.js, Fastify v5, `@fastify/websocket` | Low-overhead, high-throughput REST and real-time WebSocket server. |
| **Database** | PostgreSQL 15+, Prisma ORM | ACID transactions for atomic view limits, migrations, and strict constraints. |
| **Testing** | Vitest, React Testing Library, Supertest | Fast unit, component, cryptographic, and backend integration test suites. |

---

## Monorepo Structure

```text
cipherchat/
├── apps/
│   ├── web/                 # Next.js 15 App Router frontend
│   └── server/              # Fastify 5 REST API & WebSocket server
├── packages/
│   ├── shared/              # Shared Zod validation schemas & TypeScript types
│   └── crypto/              # Client-side cryptographic interfaces & Web Crypto engine
├── prisma/
│   ├── schema.prisma        # Normalized PostgreSQL schema
│   └── seed.ts              # Development seed script with pre-generated keys
├── docs/
│   ├── ENCRYPTION_DESIGN.md # Formal cryptographic specification
│   ├── THREAT_MODEL.md      # Adversary models & mitigations
│   └── PRIVACY.md           # Data minimization & privacy architecture
├── .github/workflows/ci.yml # Automated lint, test, and build workflow
├── docker-compose.yml       # Local PostgreSQL and Redis
├── netlify.toml             # Netlify deployment configuration
└── SECURITY.md              # Vulnerability reporting protocol
```

---

## Local Development Setup

### Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v10+
- **PostgreSQL**: v15+ (or run via Docker Compose)

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/cipherchat/cipherchat.git
cd cipherchat
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review the values in `.env`:
```env
PORT=4000
DATABASE_URL="postgresql://cipherchat:cipherchat@localhost:5432/cipherchat?schema=public"
JWT_ACCESS_SECRET="dev-jwt-access-secret-minimum-32-chars-long-change-in-prod"
JWT_REFRESH_SECRET="dev-jwt-refresh-secret-minimum-32-chars-long-change-in-prod"
COOKIE_SECRET="dev-cookie-secret-minimum-32-chars-long-change-in-prod"
ALLOWED_ORIGINS="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WS_URL="ws://localhost:4000/ws"
```

### 3. Start Database (Optional Docker Compose)
If PostgreSQL is not installed locally on your system:
```bash
docker compose up -d postgres
```

### 4. Push Schema and Seed Development Database
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

Seeded test accounts:
- **Alice Vance**: `alice` / `Password123!@#`
- **Bob Stone**: `bob` / `Password123!@#`

### 5. Build Workspace Packages
```bash
npm run build
```

### 6. Run Backend and Frontend
Open two terminal windows:
```bash
# Terminal 1: Fastify Backend & WebSockets
npm run dev:server

# Terminal 2: Next.js Frontend
npm run dev:web
```

Visit **http://localhost:3000** in your browser.

---

## Running Automated Tests

Run unit, cryptographic, and backend integration tests across all workspaces:
```bash
npm test
```

Or target specific packages:
```bash
# Cryptographic protocol tests (tampering, signing, derivation, attachments)
npm run test --workspace=@cipherchat/crypto

# Fastify backend REST & integration tests
npm run test --workspace=@cipherchat/server

# Web component & IME input tests
npm run test --workspace=@cipherchat/web
```

---

## Deployment Guide

### Frontend Deployment (Netlify)
1. Link your GitHub repository to **Netlify**.
2. Netlify will detect `netlify.toml` automatically:
   - **Base directory**: `apps/web`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
3. Configure Environment Variables in the Netlify dashboard:
   - `NEXT_PUBLIC_API_URL`: Your persistent backend URL (e.g. `https://api.cipherchat.internal`)
   - `NEXT_PUBLIC_WS_URL`: Your persistent WebSocket URL (e.g. `wss://api.cipherchat.internal/ws`)
   - `NEXT_PUBLIC_APP_ENV`: `production`

> **Note:** Long-lived WebSocket connections must connect to the separate persistent backend service, not Netlify serverless functions.

### Backend Deployment (Node.js Host / AWS EC2 / Render / Railway)
1. Provision a persistent Node.js runtime with inbound port `4000` (or `443` through a reverse proxy).
2. Configure production PostgreSQL with SSL enabled.
3. Set environment variables on the backend host:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET` (generate with `openssl rand -hex 32`)
   - `JWT_REFRESH_SECRET` (generate with `openssl rand -hex 32`)
   - `COOKIE_SECRET` (generate with `openssl rand -hex 32`)
   - `ALLOWED_ORIGINS="https://your-app.netlify.app"`
   - `NODE_ENV="production"`
4. Run migrations: `npx prisma migrate deploy`
5. Start the server: `npm run start --workspace=@cipherchat/server`

---

## Security & Limitations

Please read our detailed documentation:
- [Cryptographic Design Specification](docs/ENCRYPTION_DESIGN.md)
- [Threat Model & Adversary Analysis](docs/THREAT_MODEL.md)
- [Privacy Policy & Data Minimization](docs/PRIVACY.md)
- [Vulnerability Reporting (SECURITY.md)](SECURITY.md)

### Honest Disclosures
- **Malware & Screen Recording**: While view-once and view-twice limits enforce atomic server delivery constraints, view limits cannot physically prevent a recipient from taking a photo of their physical screen with an external device.
- **Audit Status**: CipherChat is built upon standardized W3C Web Crypto primitives, but has not yet undergone an external commercial security audit. Do not use for nation-state threat profiles without an independent evaluation.

---

## Contributing

We welcome contributions from the community!
1. Fork the repository and create your feature branch: `git checkout -b feature/my-feature`
2. Ensure all tests pass: `npm test && npm run build`
3. Commit your changes: `git commit -m 'Add new cryptographic verification feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).
