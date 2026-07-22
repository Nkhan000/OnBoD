import { Schema, model, type InferSchemaType } from "mongoose";
import { tenantScopePlugin, type TenantScoped } from "./tenant-scope.plugin.js";

const identitySchema = new Schema(
  {
    provider: { type: String, require: true }, // google, github
    subject: { type: String, require: true }, // provider's stable sub - not email
    email: { type: String, require: true },
    linkedAt: { type: Date, default: Date.now() },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true },
    emailVerified: { type: Boolean, required: true, default: false },
    displayName: { type: String, required: true },
    passwordHash: { type: String, default: null },
    identities: { type: [identitySchema], default: [] },
  },
  { timestamps: true },
);

userSchema.plugin(tenantScopePlugin); // adds "tenantId", scopes every

userSchema.index({ email: 1 }, { unique: true });
userSchema.index(
  { "identities.provider": 1, "identities.subject": 1 },
  { unique: true, sparse: true }, // sparse
);

userSchema.index({ tenantId: 1, createdAt: -1 });

export type User = InferSchemaType<typeof userSchema> & TenantScoped;
export const UserModel = model("User", userSchema);
