import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";

export const deviceRoutes: FastifyPluginAsync = async (fastify) => {
  // List current user's registered devices
  fastify.get("/", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;

    const devices = await prisma.device.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      devices: devices.map((d) => ({
        id: d.id,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        identityPublicKey: d.identityPublicKey,
        lastSeenAt: d.lastSeenAt.toISOString(),
        isRevoked: d.isRevoked,
        isCurrentDevice: d.id === user.deviceId,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  });

  // Revoke a device
  fastify.post("/:id/revoke", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device || device.userId !== user.userId) {
      return reply.status(404).send({
        statusCode: 404,
        message: "Device not found",
      });
    }

    if (device.id === user.deviceId) {
      return reply.status(400).send({
        statusCode: 400,
        message: "Cannot revoke the currently active session's device. Use logout instead.",
      });
    }

    // Revoke device and delete its active sessions
    await prisma.$transaction([
      prisma.device.update({
        where: { id },
        data: { isRevoked: true },
      }),
      prisma.session.deleteMany({
        where: { deviceId: id },
      }),
    ]);

    return reply.send({
      message: "Device revoked successfully",
      deviceId: id,
    });
  });

  // Public endpoint: Fetch verified public key bundles for a user's active devices
  fastify.get("/keys/:usernameOrId", { preHandler: requireAuth }, async (request, reply) => {
    const { usernameOrId } = request.params as { usernameOrId: string };
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(usernameOrId);
    const targetUser = await prisma.user.findFirst({
      where: isUuid ? { id: usernameOrId } : { username: usernameOrId },
      include: {
        devices: {
          where: { isRevoked: false },
        },
      },
    });

    if (!targetUser) {
      return reply.status(404).send({
        statusCode: 404,
        message: "User not found",
      });
    }

    return reply.send({
      userId: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.displayName,
      devices: targetUser.devices.map((d) => ({
        deviceId: d.id,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        identityPublicKey: d.identityPublicKey,
        signedPreKey: d.signedPreKey,
        preKeySignature: d.preKeySignature,
      })),
    });
  });
};
