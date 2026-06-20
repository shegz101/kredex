import "dotenv/config";
import { z } from "zod";

/**
 * One place that reads + validates every environment variable.
 * If something required is missing, we fail loudly at startup instead of
 * getting a confusing error deep inside a request later.
 */
const schema = z.object({
  QWEN_API_KEY: z.string().min(1, "QWEN_API_KEY is required"),
  QWEN_BASE_URL: z
    .string()
    .url()
    .default("https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET should be a long random string"),
  PORT: z.coerce.number().default(3001),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\n👉 Copy server/.env.example to server/.env and fill it in.");
  process.exit(1);
}

export const env = parsed.data;
