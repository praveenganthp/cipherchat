import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken, type AuthJwtPayload } from "../utils/auth.js";
import { prisma } from "../db.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthJwtPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  let token: string | undefined;

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (request.cookies && request.cookies.cc_access_token) {
    token = request.cookies.cc_access_token;
  }

  if (!token) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication credentials were not provided.",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    // Verify device is not revoked
    const device = await prisma.device.findUnique({
      where: { id: payload.deviceId },
      select: { isRevoked: true },
    });

    if (!device || device.isRevoked) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Device session has been revoked.",
      });
    }

    request.user = payload;
  } catch (error) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Invalid or expired access token.",
    });
  }
}
