import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import {
  CreateGroupConversationSchema,
  CreateRoomInvitationSchema,
  UpdateRoomMemberRoleSchema,
} from "@cipherchat/shared";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";
import { wsConnectionManager } from "../ws/gateway.js";

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  // Create a new private group room
  fastify.post("/", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const parseResult = CreateGroupConversationSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || "Invalid room data",
      });
    }

    const {
      title,
      description,
      memberUsernames,
      disappearingMode,
      disappearingTtlSeconds,
      defaultViewLimit,
    } = parseResult.data;

    // Resolve user IDs for requested members
    const members = await prisma.user.findMany({
      where: {
        username: { in: memberUsernames },
      },
    });

    const memberIds = Array.from(new Set([user.userId, ...members.map((m) => m.id)]));

    const newRoom = await prisma.conversation.create({
      data: {
        type: "GROUP",
        title,
        description,
        createdById: user.userId,
        disappearingMode,
        disappearingTtlSeconds,
        defaultViewLimit,
        members: {
          create: memberIds.map((uid) => ({
            userId: uid,
            role: uid === user.userId ? "OWNER" : "MEMBER",
          })),
        },
      },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    return reply.status(201).send({
      id: newRoom.id,
      title: newRoom.title,
      description: newRoom.description,
      disappearingMode: newRoom.disappearingMode,
      disappearingTtlSeconds: newRoom.disappearingTtlSeconds,
      defaultViewLimit: newRoom.defaultViewLimit,
      memberCount: newRoom.members.length,
      createdAt: newRoom.createdAt.toISOString(),
    });
  });

  // Create an invitation token for a room
  fastify.post("/:id/invite", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const parseResult = CreateRoomInvitationSchema.safeParse(request.body || {});
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || "Invalid invitation configuration",
      });
    }

    const { maxUses, expiresInHours } = parseResult.data;

    // Check caller is OWNER or ADMIN
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
    });

    if (!member || !["OWNER", "ADMIN"].includes(member.role) || member.leftAt !== null) {
      return reply.status(403).send({
        statusCode: 403,
        message: "Only room owners or administrators can generate invite links.",
      });
    }

    const rawToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.conversationInvitation.create({
      data: {
        conversationId: id,
        tokenHash: rawToken,
        createdById: user.userId,
        maxUses,
        expiresAt,
      },
    });

    return reply.status(201).send({
      id: invite.id,
      token: rawToken,
      inviteUrl: `/invite/${rawToken}`,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    });
  });

  // Join a room via invitation token
  fastify.post("/join/:token", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { token } = request.params as { token: string };

    // Atomically find, validate, and increment usedCount
    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.conversationInvitation.findUnique({
        where: { tokenHash: token },
        include: { conversation: true },
      });

      if (!invite || invite.isRevoked) {
        throw new Error("Invitation link is invalid or has been revoked.");
      }

      if (invite.expiresAt < new Date()) {
        throw new Error("Invitation link has expired.");
      }

      if (invite.usedCount >= invite.maxUses) {
        throw new Error("Invitation link has reached its maximum usage limit.");
      }

      // Check if user is already an active member
      const existingMember = await tx.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: invite.conversationId,
            userId: user.userId,
          },
        },
      });

      if (existingMember && existingMember.leftAt === null) {
        return { conversation: invite.conversation, alreadyMember: true };
      }

      // Increment usedCount
      await tx.conversationInvitation.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });

      // Add or reactivate membership
      if (existingMember) {
        await tx.conversationMember.update({
          where: { id: existingMember.id },
          data: { leftAt: null, joinedAt: new Date(), role: "MEMBER" },
        });
      } else {
        await tx.conversationMember.create({
          data: {
            conversationId: invite.conversationId,
            userId: user.userId,
            role: "MEMBER",
          },
        });
      }

      return { conversation: invite.conversation, alreadyMember: false };
    });

    // Notify room members
    wsConnectionManager.broadcastToConversation(result.conversation.id, {
      type: "ROOM_MEMBER_JOINED",
      conversationId: result.conversation.id,
      user: {
        id: user.userId,
        username: user.username,
        displayName: user.username,
        avatarUrl: null,
        role: "MEMBER",
      },
    });

    return reply.send({
      message: "Successfully joined room",
      conversationId: result.conversation.id,
      title: result.conversation.title,
    });
  });

  // List members of a room
  fastify.get("/:id/members", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const caller = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
    });

    if (!caller || caller.leftAt !== null) {
      return reply.status(403).send({ statusCode: 403, message: "Forbidden" });
    }

    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id, leftAt: null },
      include: {
        user: {
          include: {
            devices: { where: { isRevoked: false } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return reply.send({
      members: members.map((m) => ({
        userId: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        deviceCount: m.user.devices.length,
      })),
    });
  });

  // Update member role (Owner/Admin only)
  fastify.patch("/:id/members/:userId", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };

    const parseResult = UpdateRoomMemberRoleSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || "Invalid role data",
      });
    }

    const { role } = parseResult.data;

    const caller = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
    });

    if (!caller || caller.role !== "OWNER" || caller.leftAt !== null) {
      return reply.status(403).send({
        statusCode: 403,
        message: "Only the room owner can modify member administrative roles.",
      });
    }

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: targetUserId,
        },
      },
      data: { role },
    });

    return reply.send({ message: "Member role updated successfully" });
  });

  // Remove a member (Owner/Admin only)
  fastify.delete("/:id/members/:userId", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };

    const caller = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
    });

    if (!caller || !["OWNER", "ADMIN"].includes(caller.role) || caller.leftAt !== null) {
      return reply.status(403).send({
        statusCode: 403,
        message: "Only room owners or admins can remove members.",
      });
    }

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: targetUserId,
        },
      },
      data: { leftAt: new Date() },
    });

    wsConnectionManager.broadcastToConversation(id, {
      type: "ROOM_MEMBER_LEFT",
      conversationId: id,
      userId: targetUserId,
    });

    return reply.send({ message: "Member removed from room" });
  });

  // Leave room
  fastify.post("/:id/leave", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId,
        },
      },
      data: { leftAt: new Date() },
    });

    wsConnectionManager.broadcastToConversation(id, {
      type: "ROOM_MEMBER_LEFT",
      conversationId: id,
      userId: user.userId,
    });

    return reply.send({ message: "Left room successfully" });
  });
};
