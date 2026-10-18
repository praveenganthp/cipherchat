import fs from "node:fs";
import path from "node:path";
import { prisma } from "../db.js";
import { config } from "../config.js";

const storageDir = path.resolve(process.cwd(), config.UPLOAD_STORAGE_DIR);

export async function runCleanupJob(): Promise<{
  expiredMessages: number;
  expiredAttachments: number;
  expiredSessions: number;
}> {
  const now = new Date();

  // 1. Mark time-expired messages
  const expiredMessagesResult = await prisma.encryptedMessage.updateMany({
    where: {
      expiresAt: { lt: now },
      isExpired: false,
    },
    data: {
      isExpired: true,
    },
  });

  // 2. Identify expired messages with attachments and delete physical blobs
  const expiredAttachments = await prisma.encryptedAttachment.findMany({
    where: {
      message: {
        isExpired: true,
      },
    },
  });

  let deletedBlobsCount = 0;
  for (const att of expiredAttachments) {
    const filePath = path.join(storageDir, att.storageKey);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedBlobsCount++;
      }
    } catch {
      // Ignore disk error
    }
  }

  // 3. Delete expired sessions
  const expiredSessionsResult = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  return {
    expiredMessages: expiredMessagesResult.count,
    expiredAttachments: deletedBlobsCount,
    expiredSessions: expiredSessionsResult.count,
  };
}

export function startCleanupWorker(intervalMs = 60000): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await runCleanupJob();
    } catch (err) {
      console.error("Cleanup job error:", err);
    }
  }, intervalMs);
}
