import { z } from "zod";

export const CreateUploadIntentSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(52428800), // 50MB max limit
  sha256Checksum: z.string().length(64), // Hex SHA-256 of the ciphertext blob
});
export type CreateUploadIntent = z.infer<typeof CreateUploadIntentSchema>;

export interface UploadIntentResponse {
  attachmentId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
}

export interface DownloadIntentResponse {
  attachmentId: string;
  downloadUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256Checksum: string;
  remainingViews?: number;
  expiresAt: string;
}
