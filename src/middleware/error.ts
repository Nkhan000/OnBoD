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
