import type { NextFunction, Request, Response, RequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { isDev } from "@rag/config/env.js";
import { childLogger } from "@rag/lib/logger.js";

const log = childLogger("http");

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly status = "ERROR",
    public readonly details?: unknown,
    public readonly isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const BadRequest = (m: string, details?: unknown) =>
  new AppError(400, m, "BAD_REQUEST", details);
export const Unauthorized = (m = "Unauthorized") =>
  new AppError(401, m, "UNAUTHORIZED");
export const Forbidden = (m = "Forbidden") => new AppError(403, m, "FORBIDDEN");
export const NotFound = (m = "Not found") => new AppError(404, m, "NOT_FOUND");
export const Conflict = (m: string) => new AppError(409, m, "CONFLICT");

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(NotFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function normalize(err: unknown): AppError | null {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return new AppError(
      400,
      "Validation Failed",
      "Validation Error",
      err.flatten().fieldErrors,
    );
  }

  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    const fields = Object.keys(
      (err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {},
    );
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message]),
    );
    return new AppError(400, "Validation Failed", "Validation Error ", details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError(400, `Invalid ${err.path}`, "CAST_ERROR");
  }

  return null;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const appErr = normalize(err);
  const isProgramingBug = appErr === null || !appErr.isOperational;
  const statusCode = appErr?.statusCode ?? 500;

  const logPayload = {
    err,
    method: req.method,
    url: req.originalUrl,
    statusCode,
  };

  if (statusCode >= 500) log.error(logPayload, "Request Failed");
  else log.warn(logPayload, "Request Rejected");

  type Error = {
    statusCode: number;
    message: string;
    status: string;
    details?: unknown;
    stack?: string;
  };
  const body: Error = {
    statusCode,
    message:
      isProgramingBug && !isDev
        ? "Internal server error"
        : (appErr?.message ?? "Internal server error"),
    status: appErr?.status ?? "INTERNAL_ERROR",
  };

  if (appErr?.details !== undefined) body.details = appErr.details;
  if (isDev && err instanceof Error) body.stack = err.stack;

  res.status(statusCode).json(body);
}
