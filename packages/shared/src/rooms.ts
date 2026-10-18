import { z } from "zod";

export const CreateRoomInvitationSchema = z.object({
  maxUses: z.number().int().min(1).max(1000).default(10),
  expiresInHours: z.number().int().min(1).max(720).default(24), // up to 30 days
});
export type CreateRoomInvitation = z.infer<typeof CreateRoomInvitationSchema>;

export const UpdateRoomMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["ADMIN", "MEMBER"]),
});
export type UpdateRoomMemberRole = z.infer<typeof UpdateRoomMemberRoleSchema>;

export interface RoomInvitationInfo {
  id: string;
  token: string;
  inviteUrl: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface RoomMemberInfo {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  deviceCount: number;
}
