import { Schema, model, type InferSchemaType } from "mongoose";

const organizationSchema = new Schema(
  {
    displayName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["individual", "business"], required: true },
  },
  { timestamps: true },
);

export type Organization = InferSchemaType<typeof organizationSchema>;
export const OrganizationModel = model("Organization", organizationSchema);
