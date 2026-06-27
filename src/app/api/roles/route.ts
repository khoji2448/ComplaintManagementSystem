import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, ALL_PERMISSION_KEYS, PERMISSIONS } from "@/lib/permissions";
import { clearPermissionCache } from "@/lib/roles";

// GET: list roles (with their permission keys) + the full permission catalog.
// Accessible to anyone who can manage roles OR users (the user form needs the
// list of role names for its dropdown).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (!hasPermission(session.user.permissions, "roles:manage") &&
      !hasPermission(session.user.permissions, "users:manage"))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const res = await pool.query(
      `SELECT r.id, r.name, r.description, r.is_system,
              COALESCE(
                ARRAY_AGG(p.key) FILTER (WHERE p.key IS NOT NULL),
                '{}'
              ) AS permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
        GROUP BY r.id
        ORDER BY r.name ASC`
    );
    return NextResponse.json({ roles: res.rows, catalog: PERMISSIONS });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching roles: " + error }, { status: 500 });
  }
}

// POST: create a role with a set of permissions.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.permissions, "roles:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const { name, description, permissions } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, "_");

    const permKeys: string[] = Array.isArray(permissions) ? permissions : [];
    const invalid = permKeys.filter((k) => !ALL_PERMISSION_KEYS.includes(k as never));
    if (invalid.length) {
      return NextResponse.json({ error: `Unknown permissions: ${invalid.join(", ")}` }, { status: 400 });
    }

    await client.query("BEGIN");
    const roleRes = await client.query(
      "INSERT INTO roles (name, description, is_system) VALUES ($1, $2, false) RETURNING id",
      [cleanName, description ?? null]
    );
    const roleId = roleRes.rows[0].id;

    if (permKeys.length) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, p.id FROM permissions p WHERE p.key = ANY($2::text[])`,
        [roleId, permKeys]
      );
    }
    await client.query("COMMIT");
    clearPermissionCache(cleanName);

    return NextResponse.json({ message: "Role created", id: roleId, name: cleanName });
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error creating role" }, { status: 500 });
  } finally {
    client.release();
  }
}
