import { z } from "zod";

export const RegisterRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain alphanumeric characters, underscores, and dashes"),
  displayName: z.string().min(1, "Display name is required").max(50),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  device: z.object({
    deviceName: z.string().min(1).max(50),
    deviceType: z.enum(["WEB", "MOBILE", "DESKTOP"]).default("WEB"),
    identityPublicKey: z.string().min(32, "Invalid identity public key"),
    signedPreKey: z.string().min(32, "Invalid signed prekey"),
    preKeySignature: z.string().min(32, "Invalid prekey signature"),
  }),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
  device: z.object({
    deviceName: z.string().min(1).max(50),
    deviceType: z.enum(["WEB", "MOBILE", "DESKTOP"]).default("WEB"),
    identityPublicKey: z.string().min(32),
    signedPreKey: z.string().min(32),
    preKeySignature: z.string().min(32),
  }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().optional(), // Can also be in cookie
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().or(z.string().regex(/^data:image\//)).optional(),
  bio: z.string().max(200).optional(),
  readReceiptsEnabled: z.boolean().optional(),
  typingIndicatorEnabled: z.boolean().optional(),
  presenceVisibility: z.enum(["EVERYONE", "CONTACTS_ONLY", "NOBODY"]).optional(),
});

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  readReceiptsEnabled: boolean;
  typingIndicatorEnabled: boolean;
  presenceVisibility: "EVERYONE" | "CONTACTS_ONLY" | "NOBODY";
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  device: {
    id: string;
    deviceName: string;
    deviceType: string;
    identityPublicKey: string;
  };
  accessToken: string;
  refreshToken?: string;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  identityPublicKey: string;
  signedPreKey: string;
  preKeySignature: string;
  lastSeenAt: string;
  isRevoked: boolean;
  createdAt: string;
}
