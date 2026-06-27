import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { clearPermissionCache } from "@/lib/roles";

// PUT: update a role's description and permission set.
// The role name and is_system flag are not editable (renaming would orphan
// users still assigned to the old name).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.permissions, "roles:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const { id } = await params;
    const { description, permissions } = await req.json();

    const permKeys: string[] = Array.isArray(permissions) ? permissions : [];
    const invalid = permKeys.filter((k) => !ALL_PERMISSION_KEYS.includes(k as never));
    if (invalid.length) {
      return NextResponse.json({ error: `Unknown permissions: ${invalid.join(", ")}` }, { status: 400 });
    }

    const existing = await client.query("SELECT name FROM roles WHERE id = $1", [id]);
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    const roleName = existing.rows[0].name;

    await client.query("BEGIN");
    await client.query("UPDATE roles SET description = $1 WHERE id = $2", [description ?? null, id]);
    await client.query("DELETE FROM role_permissions WHERE role_id = $1", [id]);
    if (permKeys.length) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, p.id FROM permissions p WHERE p.key = ANY($2::text[])`,
        [id, permKeys]
      );
    }
    await client.query("COMMIT");
    clearPermissionCache(roleName);

    return NextResponse.json({ message: "Role updated" });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Error updating role" }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE: remove a role. Blocked for system roles or roles still in use.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.permissions, "roles:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const role = await pool.query("SELECT name, is_system FROM roles WHERE id = $1", [id]);
    if (role.rowCount === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.rows[0].is_system) {
      return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 400 });
    }

    const inUse = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = $1", [role.rows[0].name]);
    if (inUse.rows[0].count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${inUse.rows[0].count} user(s) still have this role. Reassign them first.` },
        { status: 400 }
      );
    }

    await pool.query("DELETE FROM roles WHERE id = $1", [id]);
    clearPermissionCache(role.rows[0].name);
    return NextResponse.json({ message: "Role deleted" });
  } catch {
    return NextResponse.json({ error: "Error deleting role" }, { status: 500 });
  }
}
