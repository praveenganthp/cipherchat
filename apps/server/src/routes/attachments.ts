import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CreateUploadIntentSchema } from "@cipherchat/shared";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";
import { config } from "../config.js";

// Ensure upload directory exists
const storageDir = path.resolve(process.cwd(), config.UPLOAD_STORAGE_DIR);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

export const attachmentRoutes: FastifyPluginAsync = async (fastify) => {
  // Step 1: Initiate upload intent
  fastify.post("/upload-intent", { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = CreateUploadIntentSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || "Invalid upload parameters",
      });
    }

    const { fileName, mimeType, sizeBytes, sha256Checksum } = parseResult.data;
    const storageKey = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}.blob`;

    const attachment = await prisma.encryptedAttachment.create({
      data: {
        storageKey,
        originalName: fileName,
        mimeType,
        sizeBytes,
        sha256Checksum,
      },
    });

    return reply.status(201).send({
      attachmentId: attachment.id,
      storageKey,
      uploadUrl: `/api/attachments/upload/${storageKey}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  });

  // Step 2: Stream raw ciphertext blob directly into private storage
  fastify.put("/upload/:storageKey", async (request, reply) => {
    const { storageKey } = request.params as { storageKey: string };

    const attachment = await prisma.encryptedAttachment.findUnique({
      where: { storageKey },
    });

    if (!attachment) {
      return reply.status(404).send({ statusCode: 404, message: "Upload intent not found" });
    }

    const filePath = path.join(storageDir, storageKey);
    const writeStream = fs.createWriteStream(filePath);
    const hash = crypto.createHash("sha256");

    await new Promise<void>((resolve, reject) => {
      request.raw.on("data", (chunk: Buffer) => {
        hash.update(chunk);
        writeStream.write(chunk);
      });

      request.raw.on("end", () => {
        writeStream.end();
        resolve();
      });

      request.raw.on("error", (err) => {
        writeStream.destroy();
        reject(err);
      });
    });

    // Verify SHA-256 integrity of the stored ciphertext
    const computedHash = hash.digest("hex");
    if (computedHash.toLowerCase() !== attachment.sha256Checksum.toLowerCase()) {
      fs.unlinkSync(filePath);
      await prisma.encryptedAttachment.delete({ where: { storageKey } });
      return reply.status(400).send({
        statusCode: 400,
        message: "Ciphertext integrity verification failed on upload.",
      });
    }

    return reply.send({
      message: "Encrypted blob stored successfully",
      attachmentId: attachment.id,
      storageKey,
    });
  });

  // Step 3: Request download authorization
  fastify.get("/:id/download-intent", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const attachment = await prisma.encryptedAttachment.findUnique({
      where: { id },
      include: {
        message: true,
      },
    });

    if (!attachment) {
      return reply.status(404).send({ statusCode: 404, message: "Attachment not found" });
    }

    if (attachment.message) {
      if (attachment.message.isExpired) {
        return reply.status(410).send({
          statusCode: 410,
          message: "Attachment has expired or reached view limit.",
        });
      }

      // Verify recipient authorization
      if (attachment.message.recipientId !== user.userId) {
        return reply.status(403).send({ statusCode: 403, message: "Forbidden" });
      }
    }

    return reply.send({
      attachmentId: attachment.id,
      downloadUrl: `/api/attachments/download/${attachment.storageKey}`,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      sha256Checksum: attachment.sha256Checksum,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  });

  // Step 4: Download encrypted ciphertext blob
  fastify.get("/download/:storageKey", { preHandler: requireAuth }, async (request, reply) => {
    const { storageKey } = request.params as { storageKey: string };
    const filePath = path.join(storageDir, storageKey);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ statusCode: 404, message: "File not found" });
    }

    const stat = fs.statSync(filePath);
    reply.header("Content-Type", "application/octet-stream");
    reply.header("Content-Length", stat.size);
    reply.header("Cache-Control", "private, no-cache, no-store, must-revalidate");

    const readStream = fs.createReadStream(filePath);
    return reply.send(readStream);
  });
};
