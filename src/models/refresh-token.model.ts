import { Schema, model, type InferSchemaType } from "mongoose";
import { tenantScopePlugin, type TenantScoped } from "./tenant-scope.plugin.js";
import { required } from "zod/v4-mini";

const refreshTokenSchema = new Schema(
  {
    // tenantId: {type: S}
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    familyId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

refreshTokenSchema.plugin(tenantScopePlugin);
refreshTokenSchema.index({ tokenHast: 1 }, { unique: true });
refreshTokenSchema.index({ tenantId: 1, userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefrestToken = InferSchemaType<typeof refreshTokenSchema> &
  TenantScoped;
export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema);
