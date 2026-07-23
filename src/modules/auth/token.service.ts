import crypto from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { RefreshTokenModel } from "@rag/models/refresh-token.model.js";
import { env } from "@rag/config/env.js";
import { Unauthorized } from "@rag/middleware/error.js";

const opaque = () => crypto.randomBytes(32).toString("base64url");
const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v).digest("hex");
const expiry = () => new Date(Date.now() + env.JWT_REFRESH_TTL * 864e5);

// export async function issueRefreshToken(presented: string): Promise<{
//   token: string;
//   userId: string;
//   //   tenantId: string;
// }> {
//   const hash = sha256(presented);
//   const session = await mongoose.startSession();

//   let out: { token: string; userId: string };
//   try {
//     await session.withTransaction(async () => {
//       const existing = await RefreshTokenModel.findOne({
//         tokenHash: hash,
//       }).setOptions({ skipTenantOptions: true, session });

//       if (!existing) throw Unauthorized("Invalid Refresh Token");

//       if (existing.revokedAt) {
//         await RefreshTokenModel.updateMany(
//           {
//             familyId: existing.familyId,
//             revokedAt: null,
//           },
//           { $set: { revokedAt: new Date() } },
//         ).setOptions({ skipTenantScope: true, session });

//         throw Unauthorized("Refresh token reuse detected");
//       }

//       if (existing.expiresAt.getTime() < Date.now())
//         throw Unauthorized("Refresh token expired");

//       existing.revokedAt = new Date();
//       await existing.save({ session });

//       const token = opaque();
//       await RefreshTokenModel.create([
//         {
//           userId: existing.userId,
//           tokenHash: sha256(token),
//           familyId: existing.familyId,
//           expiresAt: expiry(),
//         },
//       ]);

//       out = {
//         token,
//         userId: String(existing.userId),
//         // tenantId: existing?.tenantId,
//       };
//     });
//     return { ...out };
//   } finally {
//     await session.endSession();
//   }
// }
