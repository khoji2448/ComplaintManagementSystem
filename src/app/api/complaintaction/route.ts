import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Complaint } from "@/types/types";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.permissions, "complaints:action")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const query = `
      SELECT 
        c.*,
        a.area_name,
        ct.type_name as complaint_type_name
      FROM complaints c
      LEFT JOIN areas a ON c.area_id = a.id
      LEFT JOIN complaint_types ct ON c.complaint_type_id = ct.id
      ORDER BY c.date DESC
    `;
      const res = await pool.query<Complaint>(query);
      return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching complaints" + error }, { status: 500 });
  }
}