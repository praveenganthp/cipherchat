import type { FastifyPluginAsync } from "fastify";
import {
  CreateDirectConversationSchema,
  SendMessageRequestSchema,
} from "@cipherchat/shared";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";
import { wsConnectionManager } from "../ws/gateway.js";

export const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  // List user's conversations
  fastify.get("/", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;

    const memberships = await prisma.conversationMember.findMany({
      where: {
        userId: user.userId,
        leftAt: null,
      },
      include: {
        conversation: {
          include: {
            members: {
              where: { leftAt: null },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    presenceVisibility: true,
                    devices: {
                      where: { isRevoked: false },
                      select: { lastSeenAt: true },
                      orderBy: { lastSeenAt: "desc" },
                      take: 1,
                    },
                  },
                },
              },
            },
            messages: {
              where: {
                recipientDeviceId: user.deviceId,
                isExpired: false,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    const summaries = await Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation;
        const otherMember =
          conv.type === "DIRECT"
            ? conv.members.find((mem) => mem.userId !== user.userId)?.user
            : null;

        // Unread messages count for this device
        const unreadCount = await prisma.encryptedMessage.count({
          where: {
            conversationId: conv.id,
            recipientDeviceId: user.deviceId,
            createdAt: { gt: m.lastReadAt },
            isExpired: false,
          },
        });

        const latestMsg = conv.messages[0];

        return {
          id: conv.id,
          type: conv.type,
          title: conv.title,
          description: conv.description,
          avatarUrl: conv.avatarUrl,
          disappearingMode: conv.disappearingMode,
          disappearingTtlSeconds: conv.disappearingTtlSeconds,
          defaultViewLimit: conv.defaultViewLimit,
          memberCount: conv.members.length,
          unreadCount,
          otherMember: otherMember
            ? {
                id: otherMember.id,
                username: otherMember.username,
                displayName: otherMember.displayName,
                avatarUrl: otherMember.avatarUrl,
                isOnline: wsConnectionManager.isUserOnline(otherMember.id),
                lastSeenAt: otherMember.devices[0]?.lastSeenAt.toISOString(),
              }
            : undefined,
          lastMessage: latestMsg
            ? {
                id: latestMsg.id,
                senderId: latestMsg.senderId,
                messageType: latestMsg.messageType,
                createdAt: latestMsg.createdAt.toISOString(),
              }
            : null,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        };
      })
    );

    return reply.send({ conversations: summaries });
  });

  // Start or get direct conversation
  fastify.post("/direct", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const parseResult = CreateDirectConversationSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || "Invalid direct conversation request",
      });
    }

    const { recipientUsernameOrId } = parseResult.data;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(recipientUsernameOrId);

    const recipient = await prisma.user.findFirst({
      where: isUuid ? { id: recipientUsernameOrId } : { username: recipientUsernameOrId },
    });

    if (!recipient) {
      return reply.status(404).send({ statusCode: 404, message: "Recipient not found" });
    }

    if (recipient.id === user.userId) {
      return reply.status(400).send({ statusCode: 400, message: "Cannot create conversation with yourself" });
    }

    // Check if direct conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: user.userId, leftAt: null } } },
          { members: { some: { userId: recipient.id, leftAt: null } } },
        ],
      },
    });

    if (existing) {
      return reply.send({ conversationId: existing.id, isNew: false });
    }

    // Create new direct conversation
    const newConv = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: user.userId,
        members: {
          create: [
            { userId: user.userId, role: "MEMBER" },
            { userId: recipient.id, role: "MEMBER" },
          ],
        },
      },
    });

    return reply.status(201).send({ conversationId: newConv.id, isNew: true });
  });

  // Get conversation details & recipient device key bundles
  fastify.get("/:id", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
    });

    if (!member || member.leftAt !== null) {
      return reply.status(403).send({
        statusCode: 403,
        message: "You are not an active member of this conversation.",
      });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                devices: {
                  where: { isRevoked: false },
                  select: {
                    id: true,
                    deviceName: true,
                    deviceType: true,
                    identityPublicKey: true,
                    signedPreKey: true,
                    preKeySignature: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return reply.status(404).send({ statusCode: 404, message: "Conversation not found" });
    }

    // Update lastReadAt
    await prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    return reply.send({
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      description: conversation.description,
      avatarUrl: conversation.avatarUrl,
      disappearingMode: conversation.disappearingMode,
      disappearingTtlSeconds: conversation.disappearingTtlSeconds,
      defaultViewLimit: conversation.defaultViewLimit,
      members: conversation.members.map((m) => ({
        userId: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        devices: m.user.devices.map((d) => ({
          deviceId: d.id,
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          identityPublicKey: d.identityPublicKey,
          signedPreKey: d.signedPreKey,
          preKeySignature: d.preKeySignature,
        })),
      })),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    });
  });

  // Get message history for this device
  fastify.get("/:id/messages", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const query = request.query as { cursor?: string; limit?: string };
    const take = Math.min(parseInt(query.limit || "50", 10), 100);

    // Verify membership
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
    });

    if (!member || member.leftAt !== null) {
      return reply.status(403).send({ statusCode: 403, message: "Forbidden" });
    }

    const messages = await prisma.encryptedMessage.findMany({
      where: {
        conversationId: id,
        recipientDeviceId: user.deviceId,
        isExpired: false,
      },
      include: {
        attachment: true,
        views: {
          where: { deviceId: user.deviceId },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
    });

    return reply.send({
      messages: messages.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderDeviceId: msg.senderDeviceId,
        recipientId: msg.recipientId,
        recipientDeviceId: msg.recipientDeviceId,
        messageType: msg.messageType,
        encryptedPayload: msg.encryptedPayload,
        iv: msg.iv,
        authTag: msg.authTag,
        ephemeralPublicKey: msg.ephemeralPublicKey,
        signature: msg.signature,
        keyVersion: msg.keyVersion,
        viewLimit: msg.viewLimit,
        viewCount: msg.viewCount,
        hasViewed: msg.views.length > 0,
        isExpired: msg.isExpired,
        isDisappearing: msg.isDisappearing,
        expiresAt: msg.expiresAt?.toISOString() || null,
        createdAt: msg.createdAt.toISOString(),
        attachment: msg.attachment
          ? {
              id: msg.attachment.id,
              originalName: msg.attachment.originalName,
              mimeType: msg.attachment.mimeType,
              sizeBytes: msg.attachment.sizeBytes,
            }
          : null,
      })),
    });
  });

  // REST endpoint to send message envelopes
  fastify.post("/:id/messages", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const parseResult = SendMessageRequestSchema.safeParse({
      ...request.body as object,
      conversationId: id,
    });

    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || "Invalid message payload",
      });
    }

    const { envelopes, messageType, viewLimit, isDisappearing, ttlSeconds, attachmentId } =
      parseResult.data;

    // Verify caller is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
    });

    if (!member || member.leftAt !== null) {
      return reply.status(403).send({ statusCode: 403, message: "Forbidden" });
    }

    const expiresAt =
      isDisappearing && ttlSeconds > 0
        ? new Date(Date.now() + ttlSeconds * 1000)
        : null;

    // Create encrypted message records for each recipient device
    const createdMessages = await prisma.$transaction(
      envelopes.map((env) =>
        prisma.encryptedMessage.create({
          data: {
            conversationId: id,
            senderId: user.userId,
            senderDeviceId: user.deviceId,
            recipientId: env.recipientId,
            recipientDeviceId: env.recipientDeviceId,
            messageType,
            encryptedPayload: env.envelope.ciphertext,
            iv: env.envelope.iv,
            authTag: env.envelope.authTag,
            signature: env.envelope.signature,
            ephemeralPublicKey: env.envelope.ephemeralPublicKey,
            keyVersion: 1,
            viewLimit,
            isDisappearing,
            expiresAt,
            ...(attachmentId ? { attachment: { connect: { id: attachmentId } } } : {}),
          },
          include: { attachment: true },
        })
      )
    );

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Notify online recipients via WebSocket
    for (const msg of createdMessages) {
      wsConnectionManager.sendToDevice(msg.recipientDeviceId, {
        type: "NEW_MESSAGE",
        messageId: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderDeviceId: msg.senderDeviceId,
        messageType: msg.messageType,
        envelope: {
          version: 1,
          senderDeviceId: msg.senderDeviceId,
          recipientDeviceId: msg.recipientDeviceId,
          ephemeralPublicKey: msg.ephemeralPublicKey,
          ciphertext: msg.encryptedPayload,
          iv: msg.iv,
          authTag: msg.authTag,
          signature: msg.signature,
          timestamp: Date.now(),
        },
        viewLimit: msg.viewLimit,
        viewCount: msg.viewCount,
        isDisappearing: msg.isDisappearing,
        expiresAt: msg.expiresAt?.toISOString() || null,
        attachment: msg.attachment
          ? {
              id: msg.attachment.id,
              originalName: msg.attachment.originalName,
              mimeType: msg.attachment.mimeType,
              sizeBytes: msg.attachment.sizeBytes,
            }
          : null,
        createdAt: msg.createdAt.toISOString(),
      });
    }

    return reply.status(201).send({
      message: "Message delivered",
      messageIds: createdMessages.map((m) => m.id),
    });
  });
};
