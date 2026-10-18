import { z } from "zod";
import { EncryptedEnvelopeSchema, type EncryptedEnvelope } from "./crypto.js";

/**
 * WebSocket message types sent by Client to Server
 */
export const WsClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("AUTH"),
    token: z.string(),
    deviceId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("SUBSCRIBE_CONVERSATION"),
    conversationId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("UNSUBSCRIBE_CONVERSATION"),
    conversationId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("TYPING"),
    conversationId: z.string().uuid(),
    isTyping: z.boolean(),
  }),
  z.object({
    type: z.literal("SEND_MESSAGE"),
    requestId: z.string(),
    conversationId: z.string().uuid(),
    envelopes: z.array(
      z.object({
        recipientId: z.string().uuid(),
        recipientDeviceId: z.string().uuid(),
        envelope: EncryptedEnvelopeSchema,
      })
    ),
    messageType: z.enum(["TEXT", "ATTACHMENT", "EVENT"]).default("TEXT"),
    viewLimit: z.number().int().min(0).max(100).default(0),
    isDisappearing: z.boolean().default(false),
    ttlSeconds: z.number().int().min(0).max(2592000).default(0),
    attachmentId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal("MARK_READ"),
    conversationId: z.string().uuid(),
    messageId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("HEARTBEAT"),
    timestamp: z.number(),
  }),
]);

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

/**
 * WebSocket message types sent by Server to Client
 */
export type WsServerMessage =
  | {
      type: "AUTH_SUCCESS";
      userId: string;
      deviceId: string;
    }
  | {
      type: "ERROR";
      code: string;
      message: string;
      requestId?: string;
    }
  | {
      type: "MESSAGE_DELIVERED";
      requestId?: string;
      messageId: string;
      conversationId: string;
      createdAt: string;
    }
  | {
      type: "NEW_MESSAGE";
      messageId: string;
      conversationId: string;
      senderId: string;
      senderDeviceId: string;
      senderUsername?: string;
      senderIdentityPublicKey?: string;
      messageType: "TEXT" | "ATTACHMENT" | "EVENT";
      envelope: EncryptedEnvelope;
      viewLimit: number;
      viewCount: number;
      isDisappearing: boolean;
      expiresAt: string | null;
      attachment?: {
        id: string;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
      } | null;
      createdAt: string;
    }
  | {
      type: "MESSAGE_VIEWED";
      messageId: string;
      conversationId: string;
      viewCount: number;
      viewLimit: number;
      isExpired: boolean;
    }
  | {
      type: "MESSAGE_EXPIRED";
      messageId: string;
      conversationId: string;
    }
  | {
      type: "TYPING_STATUS";
      conversationId: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }
  | {
      type: "PRESENCE_UPDATE";
      userId: string;
      isOnline: boolean;
      lastSeenAt: string;
    }
  | {
      type: "READ_RECEIPT";
      conversationId: string;
      userId: string;
      messageId: string;
      readAt: string;
    }
  | {
      type: "ROOM_MEMBER_JOINED";
      conversationId: string;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        role: string;
      };
    }
  | {
      type: "ROOM_MEMBER_LEFT";
      conversationId: string;
      userId: string;
    }
  | {
      type: "HEARTBEAT_ACK";
      timestamp: number;
    };
