import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  MONGO_URI: z.string().min(1),
  MONGO_DB_NAME: z.string().min(1).default("rag_prc"),
  REDIS_URL: z.string().min(1),
});

export const env = EnvSchema.parse(process.env); // fails right away instead of safeParse which gives back error of failure
export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";

// const parsed = EnvSchema.safeParse(process.env);
// if (!parsed.success) {
//   console.error("Invalid Environment Configuration : ");
//   for (const issue of parsed.error.issues) {
//     console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
//     process.exit(1);
//   }
// }

// type Env = z.infer<typeof EnvSchema>;
// export const env = parsed.data;
