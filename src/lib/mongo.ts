import mongoose from "mongoose";
import { env } from "@rag/config/env.js";
import { childLogger } from "@rag/lib/logger.js";

const log = childLogger("mongo");

export async function connectMongo(): Promise<void> {
  mongoose.connection.on("connected", () =>
    log.info("MogoDB Atlas Connected."),
  );
  mongoose.connection.on("error", (err) => log.error(`${err}, MogoDB Error.`));
  mongoose.connection.on("disconnected", () =>
    log.info("MogoDB Atlas Disconnected."),
  );

  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGO_URI, {
    dbName: env.MONGO_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
  });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close(false); // false = let in-flight ops finish
  log.info("MongoDB connection closed");
}

// readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
export function mongoHealthy(): boolean {
  return mongoose.connection.readyState === 1;
}
