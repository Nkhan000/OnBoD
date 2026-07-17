import express from "express";
import { healthRouter } from "@rag/routes/health.js";
import { notFoundHandler, errorHandler } from "@rag/middleware/error.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
