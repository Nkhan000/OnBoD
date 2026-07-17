import type { Response, Request } from "express";
import { Router } from "express";
import { catchAsync } from "@rag/utils/catchAsync.js";
import { mongoHealthy } from "@rag/lib/mongo.js";
import { redisHealthy } from "@rag/lib/redis.js";

export const healthRouter = Router();

healthRouter.get("/live", (_, res: Response) => {
  res.status(200).json({ status: "ok" });
});

healthRouter.get(
  "/ready",
  catchAsync(async (_, res: Response) => {
    const [mongo, redisUp] = await Promise.all([
      Promise.resolve(mongoHealthy()),
      redisHealthy(),
    ]);

    const healthy = mongo && redisUp;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      dependencies: {
        mongo: mongo ? "up" : "down",
        redis: redisUp ? "up" : "down",
      },
    });
  }),
);
