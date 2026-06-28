import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Complaint } from "@/types/types";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.permissions, "reports:view")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const where: string[] = [];
    const values: unknown[] = [];
    const add = (sql: (n: number) => string, value: unknown) => {
      values.push(value);
      where.push(sql(values.length));
    };

    const building = searchParams.get("building");
    const floor = searchParams.get("floor");
    const area_id = searchParams.get("area_id");
    const complaint_type_id = searchParams.get("complaint_type_id");
    const user_id = searchParams.get("user_id");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");
    const q = searchParams.get("q");
    const statuses = searchParams.getAll("status");

    if (building) add((n) => `c.building = $${n}`, building);
    if (floor) add((n) => `c.floor = $${n}`, floor);
    if (area_id) add((n) => `c.area_id = $${n}`, Number(area_id));
    if (complaint_type_id) add((n) => `c.complaint_type_id = $${n}`, Number(complaint_type_id));
    if (user_id) add((n) => `c.user_id = $${n}`, Number(user_id));
    if (from_date) add((n) => `c.date >= $${n}`, from_date);
    if (to_date) add((n) => `c.date <= $${n}`, to_date + " 23:59:59");
    if (statuses.length) add((n) => `c.status = ANY($${n})`, statuses);
    if (q) add((n) => `(c.details ILIKE $${n} OR c.building ILIKE $${n} OR a.area_name ILIKE $${n})`, `%${q}%`);

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // DISTINCT ON collapses the complaint_seen fan-out to one row per complaint
    // (keeping the most recent seen record), then we re-sort by date.
    const query = `
      SELECT * FROM (
        SELECT DISTINCT ON (c.id)
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
        ${whereClause}
        ORDER BY c.id, s.seen_at DESC NULLS LAST
      ) t
      ORDER BY t.date DESC
    `;

    const res = await pool.query<Complaint>(query, values);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching complaints" + error }, { status: 500 });
  }
}
