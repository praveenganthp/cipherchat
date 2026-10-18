import type { FastifyPluginAsync } from "fastify";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  UpdateProfileSchema,
} from "@cipherchat/shared";
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256Hash,
} from "../utils/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register new user
  fastify.post("/register", async (request, reply) => {
    const parseResult = RegisterRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: parseResult.error.errors[0]?.message || "Invalid registration data",
      });
    }

    const { email, username, displayName, password, device } = parseResult.data;

    // Check username and email availability
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: existing.username === username ? "Username already taken" : "Email already registered",
      });
    }

    const passwordHash = await hashPassword(password);

    // Create user and initial device
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
        devices: {
          create: {
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            identityPublicKey: device.identityPublicKey,
            signedPreKey: device.signedPreKey,
            preKeySignature: device.preKeySignature,
          },
        },
      },
      include: {
        devices: true,
      },
    });

    const createdDevice = newUser.devices[0];

    const jwtPayload = {
      userId: newUser.id,
      deviceId: createdDevice.id,
      username: newUser.username,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    // Create session record
    await prisma.session.create({
      data: {
        userId: newUser.id,
        deviceId: createdDevice.id,
        refreshTokenHash: sha256Hash(refreshToken),
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set secure HttpOnly cookie for refresh token
    reply.setCookie("cc_refresh_token", refreshToken, {
      path: "/api/auth/refresh",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(201).send({
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        avatarUrl: newUser.avatarUrl,
        bio: newUser.bio,
        readReceiptsEnabled: newUser.readReceiptsEnabled,
        typingIndicatorEnabled: newUser.typingIndicatorEnabled,
        presenceVisibility: newUser.presenceVisibility,
        createdAt: newUser.createdAt.toISOString(),
      },
      device: {
        id: createdDevice.id,
        deviceName: createdDevice.deviceName,
        deviceType: createdDevice.deviceType,
        identityPublicKey: createdDevice.identityPublicKey,
      },
      accessToken,
    });
  });

  // Login existing user
  fastify.post("/login", async (request, reply) => {
    const parseResult = LoginRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: parseResult.error.errors[0]?.message || "Invalid login data",
      });
    }

    const { identifier, password, device } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid credentials.",
      });
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid credentials.",
      });
    }

    // Check if this device public key already exists for the user or create a new active device
    let activeDevice = await prisma.device.findFirst({
      where: {
        userId: user.id,
        identityPublicKey: device.identityPublicKey,
        isRevoked: false,
      },
    });

    if (!activeDevice) {
      activeDevice = await prisma.device.create({
        data: {
          userId: user.id,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          identityPublicKey: device.identityPublicKey,
          signedPreKey: device.signedPreKey,
          preKeySignature: device.preKeySignature,
        },
      });
    } else {
      // Update signed prekey if rotated
      activeDevice = await prisma.device.update({
        where: { id: activeDevice.id },
        data: {
          signedPreKey: device.signedPreKey,
          preKeySignature: device.preKeySignature,
          lastSeenAt: new Date(),
        },
      });
    }

    const jwtPayload = {
      userId: user.id,
      deviceId: activeDevice.id,
      username: user.username,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    await prisma.session.create({
      data: {
        userId: user.id,
        deviceId: activeDevice.id,
        refreshTokenHash: sha256Hash(refreshToken),
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    reply.setCookie("cc_refresh_token", refreshToken, {
      path: "/api/auth/refresh",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        readReceiptsEnabled: user.readReceiptsEnabled,
        typingIndicatorEnabled: user.typingIndicatorEnabled,
        presenceVisibility: user.presenceVisibility,
        createdAt: user.createdAt.toISOString(),
      },
      device: {
        id: activeDevice.id,
        deviceName: activeDevice.deviceName,
        deviceType: activeDevice.deviceType,
        identityPublicKey: activeDevice.identityPublicKey,
      },
      accessToken,
    });
  });

  // Refresh token rotation
  fastify.post("/refresh", async (request, reply) => {
    let token = request.cookies?.cc_refresh_token;

    if (!token && typeof request.body === "object" && request.body !== null && "refreshToken" in request.body) {
      token = (request.body as { refreshToken?: string }).refreshToken;
    }

    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "No refresh token provided.",
      });
    }

    try {
      const payload = verifyRefreshToken(token);
      const tokenHash = sha256Hash(token);

      const session = await prisma.session.findUnique({
        where: { refreshTokenHash: tokenHash },
        include: { device: true },
      });

      if (!session || session.expiresAt < new Date() || session.device.isRevoked) {
        if (session) {
          await prisma.session.delete({ where: { id: session.id } });
        }
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Refresh token is invalid or expired.",
        });
      }

      // Rotate refresh token
      const newJwtPayload = {
        userId: session.userId,
        deviceId: session.deviceId,
        username: payload.username,
      };

      const newAccessToken = signAccessToken(newJwtPayload);
      const newRefreshToken = signRefreshToken(newJwtPayload);

      await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: sha256Hash(newRefreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      reply.setCookie("cc_refresh_token", newRefreshToken, {
        path: "/api/auth/refresh",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        accessToken: newAccessToken,
      });
    } catch {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid refresh token.",
      });
    }
  });

  // Logout
  fastify.post("/logout", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const token = request.cookies?.cc_refresh_token;

    if (token) {
      const tokenHash = sha256Hash(token);
      await prisma.session.deleteMany({
        where: { refreshTokenHash: tokenHash },
      });
    } else {
      await prisma.session.deleteMany({
        where: {
          userId: user.userId,
          deviceId: user.deviceId,
        },
      });
    }

    reply.clearCookie("cc_refresh_token", { path: "/api/auth/refresh" });
    return reply.send({ message: "Logged out successfully" });
  });

  // Get current user profile and device
  fastify.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        devices: {
          where: { id: user.deviceId },
        },
      },
    });

    if (!dbUser) {
      return reply.status(404).send({ statusCode: 404, message: "User not found" });
    }

    const device = dbUser.devices[0];

    return reply.send({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        bio: dbUser.bio,
        readReceiptsEnabled: dbUser.readReceiptsEnabled,
        typingIndicatorEnabled: dbUser.typingIndicatorEnabled,
        presenceVisibility: dbUser.presenceVisibility,
        createdAt: dbUser.createdAt.toISOString(),
      },
      device: device
        ? {
            id: device.id,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            identityPublicKey: device.identityPublicKey,
          }
        : null,
    });
  });

  // Update profile and privacy settings
  fastify.patch("/profile", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const parseResult = UpdateProfileSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || "Invalid profile data",
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.userId },
      data: parseResult.data,
    });

    return reply.send({
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        readReceiptsEnabled: updated.readReceiptsEnabled,
        typingIndicatorEnabled: updated.typingIndicatorEnabled,
        presenceVisibility: updated.presenceVisibility,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  });
};
