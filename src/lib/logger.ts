import pino from "pino";
import { env, isProd } from "@rag/config/env.js";

export const logger = pino({
  level: env?.LOG_LEVEL,
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }),
});

export const childLogger = (module: string) => logger.child({ module });
