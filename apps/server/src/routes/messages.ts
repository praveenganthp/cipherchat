import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";
import { wsConnectionManager } from "../ws/gateway.js";

export const messageRoutes: FastifyPluginAsync = async (fastify) => {
  // Atomically consume a view for view-once / view-twice messages
  fastify.post("/:id/view", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const message = await prisma.encryptedMessage.findUnique({
      where: { id },
      include: {
        attachment: true,
      },
    });

    if (!message) {
      return reply.status(404).send({ statusCode: 404, message: "Message not found" });
    }

    // Verify caller is recipient
    if (message.recipientId !== user.userId) {
      return reply.status(403).send({ statusCode: 403, message: "Unauthorized to view this message" });
    }

    if (message.isExpired) {
      return reply.status(410).send({
        statusCode: 410,
        message: "Message has expired or view limit has already been reached.",
      });
    }

    // Atomic update with transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Check if this device already viewed this message
      const existingView = await tx.messageView.findUnique({
        where: {
          messageId_userId_deviceId: {
            messageId: id,
            userId: user.userId,
            deviceId: user.deviceId,
          },
        },
      });

      // If viewLimit applies and already at or above limit
      if (message.viewLimit > 0 && message.viewCount >= message.viewLimit) {
        throw new Error("VIEW_LIMIT_REACHED");
      }

      // Record view log if not recorded yet
      if (!existingView) {
        await tx.messageView.create({
          data: {
            messageId: id,
            userId: user.userId,
            deviceId: user.deviceId,
          },
        });
      }

      const newCount = message.viewCount + (existingView ? 0 : 1);
      const isNowExpired = message.viewLimit > 0 && newCount >= message.viewLimit;

      const result = await tx.encryptedMessage.update({
        where: { id },
        data: {
          viewCount: newCount,
          isExpired: isNowExpired,
        },
      });

      return result;
    });

    // Notify sender of view/expiration event
    wsConnectionManager.sendToDevice(message.senderDeviceId, {
      type: "MESSAGE_VIEWED",
      messageId: message.id,
      conversationId: message.conversationId,
      viewCount: updated.viewCount,
      viewLimit: updated.viewLimit,
      isExpired: updated.isExpired,
    });

    if (updated.isExpired) {
      wsConnectionManager.broadcastToConversation(message.conversationId, {
        type: "MESSAGE_EXPIRED",
        messageId: message.id,
        conversationId: message.conversationId,
      });
    }

    return reply.send({
      messageId: updated.id,
      viewCount: updated.viewCount,
      viewLimit: updated.viewLimit,
      isExpired: updated.isExpired,
      remainingViews: updated.viewLimit > 0 ? Math.max(0, updated.viewLimit - updated.viewCount) : null,
    });
  });
};
