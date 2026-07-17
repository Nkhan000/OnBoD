import { createApp } from "@rag/app.js";
import { env } from "@rag/config/env.js";
import { logger } from "@rag/lib/logger.js";
import { connectMongo, disconnectMongo } from "@rag/lib/mongo.js";
import { connectRedis, disconnectRedis } from "@rag/lib/redis.js";

async function bootstrap() {
  await connectMongo();
  await connectRedis();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      `🚀 Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      try {
        await Promise.all([disconnectMongo(), disconnectRedis()]);
        logger.info("Shutdown complete");
        process.exit(0);
      } catch (err) {
        logger.error(err, "Error during shutdown");
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) =>
    logger.error({ reason }, "Unhandled rejection"),
  );

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception — exiting");
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
