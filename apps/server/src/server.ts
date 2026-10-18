import fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import sensible from "@fastify/sensible";

import { config } from "./config.js";
import { prisma } from "./db.js";
import { authRoutes } from "./routes/auth.js";
import { deviceRoutes } from "./routes/devices.js";
import { conversationRoutes } from "./routes/conversations.js";
import { roomRoutes } from "./routes/rooms.js";
import { messageRoutes } from "./routes/messages.js";
import { attachmentRoutes } from "./routes/attachments.js";
import { handleWebSocketConnection } from "./ws/gateway.js";
import { startCleanupWorker } from "./jobs/cleanup.js";

export function buildServer() {
  const app = fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      redact: ["req.headers.authorization", "req.headers.cookie", "body.password"],
    },
  });

  // Security & Utility Plugins
  app.register(sensible);

  const allowedOrigins = config.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith(".netlify.app") || origin.includes("localhost")) {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });

  app.register(cookie, {
    secret: config.COOKIE_SECRET,
  });

  app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  app.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB WebSocket max frame
    },
  });

  // Health and Readiness
  app.get("/health", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: "connected",
      });
    } catch {
      return reply.status(503).send({
        status: "error",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: "disconnected",
      });
    }
  });

  // REST API Routes
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(deviceRoutes, { prefix: "/api/devices" });
  app.register(conversationRoutes, { prefix: "/api/conversations" });
  app.register(roomRoutes, { prefix: "/api/rooms" });
  app.register(messageRoutes, { prefix: "/api/messages" });
  app.register(attachmentRoutes, { prefix: "/api/attachments" });

  // WebSocket Route
  app.register(async function (wsServer) {
    wsServer.get("/ws", { websocket: true }, (socket, _req) => {
      handleWebSocketConnection(socket);
    });
  });

  return app;
}

async function start() {
  const app = buildServer();

  // Start background expiration and cleanup worker
  startCleanupWorker(60000);

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`🔒 CipherChat API & WebSocket Server running at http://${config.HOST}:${config.PORT}`);
    console.log(`📡 WebSocket endpoint ready at ws://${config.HOST}:${config.PORT}/ws`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const sig of signals) {
    process.on(sig, async () => {
      console.log(`\n🛑 Received ${sig}, shutting down gracefully...`);
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }
}

if (process.env.NODE_ENV !== "test") {
  start();
}
