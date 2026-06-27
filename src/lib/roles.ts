// Server-only helpers for resolving a role's permissions from the database.
// Imports pg, so must NOT be imported by middleware or client components.

import { pool } from "@/lib/db";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

type CacheEntry = { perms: string[]; ts: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

/**
 * Returns the permission keys granted to a role.
 * `admin` always resolves to every permission (safety net against lockout).
 */
export async function getPermissionsForRole(role: string | undefined | null): Promise<string[]> {
  if (!role) return [];
  if (role === "admin") return [...ALL_PERMISSION_KEYS];

  const cached = cache.get(role);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.perms;

  const res = await pool.query(
    `SELECT p.key
       FROM role_permissions rp
       JOIN roles r       ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = $1`,
    [role]
  );
  const perms = res.rows.map((r) => r.key as string);
  cache.set(role, { perms, ts: Date.now() });
  return perms;
}

/** Clear the cache (call after a role's permissions change). */
export function clearPermissionCache(role?: string) {
  if (role) cache.delete(role);
  else cache.clear();
}
