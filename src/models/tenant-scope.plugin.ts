import type {
  Schema,
  Query,
  Aggregate,
  MongooseQueryMiddleware,
} from "mongoose";
import { getTenantId, requireTenantId } from "../lib/tenant-context.js";

const QUERY_HOOKS: MongooseQueryMiddleware[] = [
  //   "count",
  "countDocuments",
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "replaceOne",
];

export interface TenantScoped {
  tenantId: string;
}

interface TenantScopeOptions {
  skipTenantScope: boolean;
}

export function tenantScopePlugin(schema: Schema): void {
  schema.add({ tenandId: { type: String, required: true, index: true } });

  schema.pre(QUERY_HOOKS, function (this: Query<unknown, unknown>) {
    if ((this.getOptions() as TenantScopeOptions).skipTenantScope) return;
    const tenantId = requireTenantId(); // gets tenantId and throws error if not scoped
    if (this.getFilter().tenantId === undefined) this.where({ tenantId }); // never overrides if already exists
  });

  schema.pre("save", function (this: { tenantId?: string }) {
    if (this.tenantId) return;
    const tenantId = getTenantId(); // does not throw just checks whether it is available or not
    if (tenantId) this.tenantId = tenantId;
  });

  schema.pre("insertMany", function (next, docs: Array<{ tenantId: string }>) {
    const tenantId = getTenantId();
    if (tenantId) for (const d of docs) if (!d.tenantId) d.tenantId = tenantId;
    next();
  });

  // aggregation bypasses query hooks - scope them explicitly
  schema.pre("aggregate", function (this: Aggregate<unknown>) {
    if ((this.options as TenantScopeOptions)?.skipTenantScope) return;
    this.pipeline().unshift({ $match: { tenantId: requireTenantId() } });
  });
}
