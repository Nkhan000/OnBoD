import { Redis } from "ioredis";
import { env } from "@rag/config/env.js";
import { childLogger } from "@rag/lib/logger.js";

const log = childLogger("redis");

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => log.info("Redis connected"));
redis.on("error", (err) => log.error({ err }, "Redis error"));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  log.info("redis disconnected");
}

export async function redisHealthy(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
