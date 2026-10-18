import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Load .env from cwd or parent directories
const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../.env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
dotenv.config();

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://cipherchat:cipherchat@localhost:5432/cipherchat?schema=public"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default("dev-jwt-access-secret-minimum-32-chars-long-change-in-prod"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default("dev-jwt-refresh-secret-minimum-32-chars-long-change-in-prod"),
  COOKIE_SECRET: z
    .string()
    .min(16)
    .default("dev-cookie-secret-minimum-32-chars-long-change-in-prod"),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000,https://cipherchat.netlify.app"),
  UPLOAD_STORAGE_DIR: z.string().default("./uploads"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export type Config = z.infer<typeof ConfigSchema>;

let parsedConfig: Config;

try {
  parsedConfig = ConfigSchema.parse(process.env);
} catch (error) {
  console.error("❌ Invalid server environment configuration:", error);
  process.exit(1);
}

export const config = parsedConfig;
