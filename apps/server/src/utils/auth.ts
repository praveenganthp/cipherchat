import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { config } from "../config.js";

export interface AuthJwtPayload {
  userId: string;
  deviceId: string;
  username: string;
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 10);
}

export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export function signAccessToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): AuthJwtPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as AuthJwtPayload;
}

export function verifyRefreshToken(token: string): AuthJwtPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as AuthJwtPayload;
}

export function sha256Hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
