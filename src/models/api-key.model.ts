import { Schema, model, type InferSchemaType } from "mongoose";
import { tenantScopePlugin, type TenantScoped } from "./tenant-scope.plugin.js";

const apiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    keyHash: { type: String, required: true },
    prefix: { type: String, required: true },
    label: { type: String, default: null },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

apiKeySchema.plugin(tenantScopePlugin);
apiKeySchema.index({ keyHash: 1 }, { unique: true }); // global — pre-tenant
apiKeySchema.index({ tenantId: 1, userId: 1 }); // scoped listing

export type ApiKey = InferSchemaType<typeof apiKeySchema> & TenantScoped;
export const ApiKeyModel = model("ApiKey", apiKeySchema);
