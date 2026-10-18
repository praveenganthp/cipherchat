import { z } from "zod";
import { EncryptedEnvelopeSchema } from "./crypto.js";

export const ConversationTypeEnum = z.enum(["DIRECT", "GROUP"]);
export type ConversationType = z.infer<typeof ConversationTypeEnum>;

export const DisappearingModeEnum = z.enum(["OFF", "TIMER", "VIEW_ONCE", "VIEW_TWICE", "CUSTOM_VIEWS"]);
export type DisappearingMode = z.infer<typeof DisappearingModeEnum>;

export const CreateDirectConversationSchema = z.object({
  recipientUsernameOrId: z.string().min(1),
});
export type CreateDirectConversation = z.infer<typeof CreateDirectConversationSchema>;

export const CreateGroupConversationSchema = z.object({
  title: z.string().min(1, "Room title is required").max(100),
  description: z.string().max(500).optional(),
  memberUsernames: z.array(z.string()).default([]),
  disappearingMode: DisappearingModeEnum.default("OFF"),
  disappearingTtlSeconds: z.number().int().min(0).max(2592000).default(0), // up to 30 days
  defaultViewLimit: z.number().int().min(0).max(100).default(0),
});
export type CreateGroupConversation = z.infer<typeof CreateGroupConversationSchema>;

export const SendMessageRequestSchema = z.object({
  conversationId: z.string().uuid(),
  // For direct messages or group messages, an array of envelopes (one per recipient device)
  envelopes: z.array(
    z.object({
      recipientId: z.string().uuid(),
      recipientDeviceId: z.string().uuid(),
      envelope: EncryptedEnvelopeSchema,
    })
  ).min(1),
  // Metadata fields that server needs to enforce policies
  messageType: z.enum(["TEXT", "ATTACHMENT", "EVENT"]).default("TEXT"),
  viewLimit: z.number().int().min(0).max(100).default(0), // 0 means unlimited
  isDisappearing: z.boolean().default(false),
  ttlSeconds: z.number().int().min(0).max(2592000).default(0),
  attachmentId: z.string().uuid().optional(),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const ConsumeViewRequestSchema = z.object({
  messageId: z.string().uuid(),
});
export type ConsumeViewRequest = z.infer<typeof ConsumeViewRequestSchema>;

export interface EncryptedMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderDeviceId: string;
  recipientId: string;
  recipientDeviceId: string;
  messageType: "TEXT" | "ATTACHMENT" | "EVENT";
  encryptedPayload: string; // Base64 ciphertext
  iv: string;
  authTag: string;
  ephemeralPublicKey: string;
  signature: string;
  keyVersion: number;
  viewLimit: number;
  viewCount: number;
  hasViewed: boolean;
  isExpired: boolean;
  isDisappearing: boolean;
  expiresAt: string | null;
  createdAt: string;
  isRead?: boolean;
  isDelivered?: boolean;
  senderIdentityPublicKey?: string;
  senderUsername?: string;
  attachment?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    downloadUrl?: string;
  } | null;
}

export interface ConversationSummary {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string;
  description?: string;
  avatarUrl?: string;
  disappearingMode: "OFF" | "TIMER" | "VIEW_ONCE" | "VIEW_TWICE" | "CUSTOM_VIEWS";
  disappearingTtlSeconds: number;
  defaultViewLimit: number;
  otherMember?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline?: boolean;
    lastSeenAt?: string;
  };
  memberCount: number;
  unreadCount: number;
  lastMessage?: {
    id: string;
    senderId: string;
    messageType: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
