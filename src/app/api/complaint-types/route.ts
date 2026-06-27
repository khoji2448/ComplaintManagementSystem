import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM complaint_types ORDER BY type_name ASC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching complaint types" + error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.permissions, "complaint_types:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name } = await req.json();
    const res = await pool.query("INSERT INTO complaint_types (type_name) VALUES ($1) RETURNING *", [name]);
    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Error adding complaint type" + error }, { status: 500 });
  }
}

