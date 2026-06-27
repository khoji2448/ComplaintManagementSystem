// Single source of truth for the permission catalog and access checks.
// This module is dependency-free (no DB / node imports) so it is safe to import
// from middleware (edge), client components, and server code alike.

export const PERMISSIONS = [
  { key: "dashboard:view", label: "View Dashboard" },
  { key: "complaints:create", label: "Submit Complaints" },
  { key: "complaints:action", label: "Take Action / Resolve Complaints" },
  { key: "reports:view", label: "View Reports" },
  { key: "users:manage", label: "Manage Users" },
  { key: "areas:manage", label: "Manage Areas" },
  { key: "complaint_types:manage", label: "Manage Complaint Types" },
  { key: "roles:manage", label: "Manage Roles & Permissions" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export function hasPermission(
  perms: string[] | undefined | null,
  key: PermissionKey
): boolean {
  return Array.isArray(perms) && perms.includes(key);
}

// Returns the best landing page for a user given their permissions, or null if
// they can't access any page. Order = priority of where to send them first.
export function firstAccessiblePath(perms: string[] | undefined | null): string | null {
  if (!perms || perms.length === 0) return null;
  const ordered: { path: string; perm: PermissionKey }[] = [
    { path: "/dashboard", perm: "dashboard:view" },
    { path: "/complaintentry", perm: "complaints:create" },
    { path: "/complaintsaction", perm: "complaints:action" },
    { path: "/reports", perm: "reports:view" },
    { path: "/manageuser", perm: "users:manage" },
    { path: "/manageareas", perm: "areas:manage" },
    { path: "/managecomplainttype", perm: "complaint_types:manage" },
    { path: "/manageroles", perm: "roles:manage" },
  ];
  const match = ordered.find((o) => perms.includes(o.perm));
  return match ? match.path : null;
}

// Page route prefix -> permission required to access it.
// Used by middleware for page-level gating. API authorization is enforced
// inside each route handler (method-aware), not here.
export const PAGE_PERMISSIONS: { prefix: string; perm: PermissionKey }[] = [
  { prefix: "/dashboard", perm: "dashboard:view" },
  { prefix: "/complaintentry", perm: "complaints:create" },
  { prefix: "/no-complaint", perm: "complaints:create" },
  { prefix: "/reports", perm: "reports:view" },
  { prefix: "/complaintsaction", perm: "complaints:action" },
  { prefix: "/manageuser", perm: "users:manage" },
  { prefix: "/manageareas", perm: "areas:manage" },
  { prefix: "/managecomplainttype", perm: "complaint_types:manage" },
  { prefix: "/manageroles", perm: "roles:manage" },
];
