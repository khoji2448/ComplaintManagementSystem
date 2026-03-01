import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Complaint } from "@/types/types";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const query = `
      SELECT 
        c.*,
        u.name as user_name,
        a.area_name,
        ct.type_name as complaint_type_name,
        s.seen_at as seen_date,
        s.user_id as seen_by
      FROM complaints c
      LEFT JOIN areas a ON c.area_id = a.id
      LEFT JOIN complaint_types ct ON c.complaint_type_id = ct.id
      LEFT JOIN complaint_seen s ON c.id = s.complaint_id
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.date DESC
    `;
      const res = await pool.query<Complaint>(query);
      return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching complaints" + error }, { status: 500 });
  }
}