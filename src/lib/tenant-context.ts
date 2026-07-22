import { AsyncLocalStorage } from "node:async_hooks";

interface TenantStore {
  tenantId: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

/**
  Establish the tenant scope for everything that runs inside `fn`,
  including all downstream awaits. Called once per request at the HTTP boundary.
 */
export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return storage.run({ tenantId }, fn);
}

export function getTenantId(): string | undefined {
  return storage.getStore()?.tenantId;
}

export function requireTenantId(): string {
  const store = storage.getStore();

  if (!store || typeof store.tenantId !== "string") {
    throw new Error(
      "Tenant context missing: a scoped query ran outside runWithTenant() " +
        "and did not set { skipTenantScope: true }",
    );
  }

  return store.tenantId;
}
