import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { prisma } from "../db.js";
import {
  generateIdentityKeyPair,
  generatePreKeyPair,
  signPreKey,
} from "@cipherchat/crypto";

describe("CipherChat Backend REST API Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("should respond with healthy status on GET /health", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });

  it("should register a new user and device with cryptographic keys", async () => {
    const identity = await generateIdentityKeyPair();
    const prekey = await generatePreKeyPair();
    const preKeySig = await signPreKey(
      identity.keyPair.privateKey,
      prekey.serialized.publicKey
    );

    const testEmail = `testuser_${Date.now()}@cipherchat.internal`;
    const testUsername = `testuser_${Date.now()}`;

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: testEmail,
        username: testUsername,
        displayName: "Test User",
        password: "SecurePassword123!@#",
        device: {
          deviceName: "Test Browser Device",
          deviceType: "WEB",
          identityPublicKey: identity.serialized.publicKey,
          signedPreKey: prekey.serialized.publicKey,
          preKeySignature: preKeySig,
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.username).toBe(testUsername);
    expect(body.accessToken).toBeDefined();
    expect(body.device.id).toBeDefined();

    // Verify password is not plaintext
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.passwordHash).not.toBe("SecurePassword123!@#");
    expect(dbUser?.passwordHash.startsWith("$2")).toBe(true);
  });

  it("should authenticate Alice using seeded credentials", async () => {
    const identity = await generateIdentityKeyPair();
    const prekey = await generatePreKeyPair();
    const preKeySig = await signPreKey(
      identity.keyPair.privateKey,
      prekey.serialized.publicKey
    );

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        identifier: "alice",
        password: "Password123!@#",
        device: {
          deviceName: "Alice New Device",
          deviceType: "WEB",
          identityPublicKey: identity.serialized.publicKey,
          signedPreKey: prekey.serialized.publicKey,
          preKeySignature: preKeySig,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.username).toBe("alice");
    expect(body.accessToken).toBeDefined();
  });

  it("should reject unauthorized requests to protected endpoints", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should look up device public key bundles for encryption", async () => {
    // 1. Authenticate Alice to get access token
    const identity = await generateIdentityKeyPair();
    const prekey = await generatePreKeyPair();
    const preKeySig = await signPreKey(
      identity.keyPair.privateKey,
      prekey.serialized.publicKey
    );

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        identifier: "alice",
        password: "Password123!@#",
        device: {
          deviceName: "Alice Device",
          deviceType: "WEB",
          identityPublicKey: identity.serialized.publicKey,
          signedPreKey: prekey.serialized.publicKey,
          preKeySignature: preKeySig,
        },
      },
    });

    const { accessToken } = JSON.parse(loginRes.body);

    // 2. Fetch Bob's public keys
    const keysRes = await app.inject({
      method: "GET",
      url: "/api/devices/keys/bob",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(keysRes.statusCode).toBe(200);
    const keysBody = JSON.parse(keysRes.body);
    expect(keysBody.username).toBe("bob");
    expect(keysBody.devices.length).toBeGreaterThan(0);
    expect(keysBody.devices[0].identityPublicKey).toBeDefined();
    expect(keysBody.devices[0].signedPreKey).toBeDefined();
  });
});
