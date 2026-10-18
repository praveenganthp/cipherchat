import type { WebSocket } from "ws";
import {
  WsClientMessageSchema,
  type WsServerMessage,
  type WsClientMessage,
} from "@cipherchat/shared";
import { verifyAccessToken } from "../utils/auth.js";
import { prisma } from "../db.js";

interface ConnectedClient {
  socket: WebSocket;
  userId: string;
  deviceId: string;
  username: string;
  subscriptions: Set<string>; // conversationIds
}

class WsConnectionManager {
  private clients = new Map<string, ConnectedClient>(); // deviceId -> ConnectedClient
  private userDevices = new Map<string, Set<string>>(); // userId -> Set<deviceId>

  public addClient(client: ConnectedClient) {
    this.clients.set(client.deviceId, client);

    if (!this.userDevices.has(client.userId)) {
      this.userDevices.set(client.userId, new Set());
    }
    this.userDevices.get(client.userId)!.add(client.deviceId);

    this.broadcastPresence(client.userId, true);
  }

  public removeClient(deviceId: string) {
    const client = this.clients.get(deviceId);
    if (!client) return;

    this.clients.delete(deviceId);

    const devices = this.userDevices.get(client.userId);
    if (devices) {
      devices.delete(deviceId);
      if (devices.size === 0) {
        this.userDevices.delete(client.userId);
        this.broadcastPresence(client.userId, false);
      }
    }
  }

  public isUserOnline(userId: string): boolean {
    const devices = this.userDevices.get(userId);
    return !!devices && devices.size > 0;
  }

  public sendToDevice(deviceId: string, message: WsServerMessage) {
    const client = this.clients.get(deviceId);
    if (client && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  public broadcastToConversation(
    conversationId: string,
    message: WsServerMessage,
    excludeDeviceId?: string
  ) {
    const payload = JSON.stringify(message);
    for (const [deviceId, client] of this.clients.entries()) {
      if (excludeDeviceId && deviceId === excludeDeviceId) continue;
      if (client.subscriptions.has(conversationId) && client.socket.readyState === client.socket.OPEN) {
        client.socket.send(payload);
      }
    }
  }

  public broadcastPresence(userId: string, isOnline: boolean) {
    const message: WsServerMessage = {
      type: "PRESENCE_UPDATE",
      userId,
      isOnline,
      lastSeenAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.socket.readyState === client.socket.OPEN) {
        client.socket.send(payload);
      }
    }
  }
}

export const wsConnectionManager = new WsConnectionManager();

export async function handleWebSocketConnection(socket: WebSocket) {
  let authenticatedClient: ConnectedClient | null = null;

  socket.on("message", async (data: Buffer | string) => {
    try {
      const raw = typeof data === "string" ? data : data.toString("utf-8");
      const parsedJson = JSON.parse(raw);
      const parsed = WsClientMessageSchema.safeParse(parsedJson);

      if (!parsed.success) {
        socket.send(
          JSON.stringify({
            type: "ERROR",
            code: "BAD_REQUEST",
            message: "Invalid WebSocket message format",
          })
        );
        return;
      }

      const msg = parsed.data;

      // Unauthenticated messages must be AUTH
      if (!authenticatedClient) {
        if (msg.type !== "AUTH") {
          socket.send(
            JSON.stringify({
              type: "ERROR",
              code: "UNAUTHORIZED",
              message: "Connection requires authentication.",
            })
          );
          return;
        }

        try {
          const payload = verifyAccessToken(msg.token);
          const device = await prisma.device.findUnique({
            where: { id: msg.deviceId },
            include: { user: true },
          });

          if (!device || device.isRevoked || device.userId !== payload.userId) {
            socket.send(
              JSON.stringify({
                type: "ERROR",
                code: "REVOKED",
                message: "Device session is revoked or invalid.",
              })
            );
            socket.close();
            return;
          }

          // Register client
          authenticatedClient = {
            socket,
            userId: payload.userId,
            deviceId: msg.deviceId,
            username: payload.username,
            subscriptions: new Set(),
          };

          wsConnectionManager.addClient(authenticatedClient);

          socket.send(
            JSON.stringify({
              type: "AUTH_SUCCESS",
              userId: payload.userId,
              deviceId: msg.deviceId,
            })
          );
        } catch {
          socket.send(
            JSON.stringify({
              type: "ERROR",
              code: "UNAUTHORIZED",
              message: "Invalid or expired token.",
            })
          );
          socket.close();
        }
        return;
      }

      // Handle authenticated events
      await processClientMessage(authenticatedClient, msg);
    } catch (err) {
      socket.send(
        JSON.stringify({
          type: "ERROR",
          code: "SERVER_ERROR",
          message: "Internal WebSocket server error.",
        })
      );
    }
  });

  socket.on("close", async () => {
    if (authenticatedClient) {
      wsConnectionManager.removeClient(authenticatedClient.deviceId);
      await prisma.device.update({
        where: { id: authenticatedClient.deviceId },
        data: { lastSeenAt: new Date() },
      }).catch(() => {});
    }
  });
}

async function processClientMessage(client: ConnectedClient, msg: WsClientMessage) {
  switch (msg.type) {
    case "HEARTBEAT": {
      client.socket.send(
        JSON.stringify({
          type: "HEARTBEAT_ACK",
          timestamp: Date.now(),
        })
      );
      break;
    }

    case "SUBSCRIBE_CONVERSATION": {
      // Verify caller is active member of this conversation
      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: msg.conversationId,
            userId: client.userId,
          },
        },
      });

      if (member && member.leftAt === null) {
        client.subscriptions.add(msg.conversationId);
      } else {
        client.socket.send(
          JSON.stringify({
            type: "ERROR",
            code: "FORBIDDEN",
            message: "Cannot subscribe to conversation: not a member.",
          })
        );
      }
      break;
    }

    case "UNSUBSCRIBE_CONVERSATION": {
      client.subscriptions.delete(msg.conversationId);
      break;
    }

    case "TYPING": {
      // Check user privacy settings for typing indicators
      const user = await prisma.user.findUnique({
        where: { id: client.userId },
        select: { typingIndicatorEnabled: true },
      });

      if (user?.typingIndicatorEnabled) {
        wsConnectionManager.broadcastToConversation(
          msg.conversationId,
          {
            type: "TYPING_STATUS",
            conversationId: msg.conversationId,
            userId: client.userId,
            username: client.username,
            isTyping: msg.isTyping,
          },
          client.deviceId
        );
      }
      break;
    }

    case "SEND_MESSAGE": {
      // Verify membership
      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: msg.conversationId,
            userId: client.userId,
          },
        },
      });

      if (!member || member.leftAt !== null) {
        client.socket.send(
          JSON.stringify({
            type: "ERROR",
            code: "FORBIDDEN",
            message: "Cannot send message: not a member.",
            requestId: msg.requestId,
          })
        );
        return;
      }

      const expiresAt =
        msg.isDisappearing && msg.ttlSeconds > 0
          ? new Date(Date.now() + msg.ttlSeconds * 1000)
          : null;

      // Create message records in DB transaction
      const createdMessages = await prisma.$transaction(
        msg.envelopes.map((env) =>
          prisma.encryptedMessage.create({
            data: {
              conversationId: msg.conversationId,
              senderId: client.userId,
              senderDeviceId: client.deviceId,
              recipientId: env.recipientId,
              recipientDeviceId: env.recipientDeviceId,
              messageType: msg.messageType,
              encryptedPayload: env.envelope.ciphertext,
              iv: env.envelope.iv,
              authTag: env.envelope.authTag,
              signature: env.envelope.signature,
              ephemeralPublicKey: env.envelope.ephemeralPublicKey,
              keyVersion: 1,
              viewLimit: msg.viewLimit,
              isDisappearing: msg.isDisappearing,
              expiresAt,
              ...(msg.attachmentId ? { attachment: { connect: { id: msg.attachmentId } } } : {}),
            },
            include: { attachment: true },
          })
        )
      );

      // Confirm delivery to sender
      client.socket.send(
        JSON.stringify({
          type: "MESSAGE_DELIVERED",
          requestId: msg.requestId,
          messageId: createdMessages[0]?.id,
          conversationId: msg.conversationId,
          createdAt: new Date().toISOString(),
        })
      );

      // Dispatch to each recipient device
      for (const msgRecord of createdMessages) {
        wsConnectionManager.sendToDevice(msgRecord.recipientDeviceId, {
          type: "NEW_MESSAGE",
          messageId: msgRecord.id,
          conversationId: msgRecord.conversationId,
          senderId: msgRecord.senderId,
          senderDeviceId: msgRecord.senderDeviceId,
          messageType: msgRecord.messageType,
          envelope: {
            version: 1,
            senderDeviceId: msgRecord.senderDeviceId,
            recipientDeviceId: msgRecord.recipientDeviceId,
            ephemeralPublicKey: msgRecord.ephemeralPublicKey,
            ciphertext: msgRecord.encryptedPayload,
            iv: msgRecord.iv,
            authTag: msgRecord.authTag,
            signature: msgRecord.signature,
            timestamp: Date.now(),
          },
          viewLimit: msgRecord.viewLimit,
          viewCount: msgRecord.viewCount,
          isDisappearing: msgRecord.isDisappearing,
          expiresAt: msgRecord.expiresAt?.toISOString() || null,
          attachment: msgRecord.attachment
            ? {
                id: msgRecord.attachment.id,
                originalName: msgRecord.attachment.originalName,
                mimeType: msgRecord.attachment.mimeType,
                sizeBytes: msgRecord.attachment.sizeBytes,
              }
            : null,
          createdAt: msgRecord.createdAt.toISOString(),
        });
      }
      break;
    }

    case "MARK_READ": {
      // Check if user has read receipts enabled
      const user = await prisma.user.findUnique({
        where: { id: client.userId },
        select: { readReceiptsEnabled: true },
      });

      await prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId: msg.conversationId,
            userId: client.userId,
          },
        },
        data: { lastReadAt: new Date() },
      });

      if (user?.readReceiptsEnabled) {
        wsConnectionManager.broadcastToConversation(
          msg.conversationId,
          {
            type: "READ_RECEIPT",
            conversationId: msg.conversationId,
            userId: client.userId,
            messageId: msg.messageId,
            readAt: new Date().toISOString(),
          },
          client.deviceId
        );
      }
      break;
    }
  }
}
