import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM areas ORDER BY area_name ASC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching areas" + error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.permissions, "areas:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body || !body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid area name" }, { status: 400 });
    }

    const res = await pool.query("INSERT INTO areas (area_name) VALUES ($1) RETURNING *", [body.name]);

    return NextResponse.json({ message: "Area added successfully", area: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Error adding area" + error }, { status: 500 });
  }
}