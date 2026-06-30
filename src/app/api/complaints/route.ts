import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Complaint } from "@/types/types";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const user_id = session.user.id;
    const status = new URL(req.url).searchParams.get("status");

    const baseQuery = `
      SELECT
        c.*,
        u.name as user_name,
        a.area_name,
        ct.type_name as complaint_type_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN areas a ON c.area_id = a.id
      LEFT JOIN complaint_types ct ON c.complaint_type_id = ct.id
    `;

    // Build WHERE/params so non-admins are scoped to their own rows and an
    // optional status filter is applied in SQL (instead of fetching everything
    // and filtering in the browser).
    const where: string[] = [];
    const values: unknown[] = [];
    if (session.user.role !== "admin") {
      values.push(user_id);
      where.push(`c.user_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      where.push(`c.status = $${values.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = `${baseQuery} ${whereClause} ORDER BY c.date DESC`;
    const res = await pool.query<Complaint>(query, values);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching complaints" + error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();
    const { date,building, floor, area_id, complaint_type_id, details } = data;
    const user_id = session.user.id;

    if (!building || !floor || !area_id || !complaint_type_id || !details) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const query = `
      INSERT INTO complaints (user_id, building, floor, area_id, complaint_type_id, details, status,date) 
      VALUES ($1, $2, $3, $4, $5, $6, 'In-Progress', $7) RETURNING *;
    `;

    const values = [user_id, building, floor, area_id, complaint_type_id, details, date];
    const res = await pool.query(query, values);

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Error submitting complaint" + error }, { status: 500 });
  }
}
