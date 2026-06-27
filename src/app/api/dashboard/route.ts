import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// Helper to build dynamic WHERE clause and values based on query params
function buildFilters(searchParams: URLSearchParams) {
  const where: string[] = [];
  const values: any[] = [];

  const building = searchParams.get("building");
  const floor = searchParams.get("floor");
  const area_id = searchParams.get("area_id");
  const complaint_type_id = searchParams.get("complaint_type_id");
  const status = searchParams.get("status");
  const from_date = searchParams.get("from_date"); // YYYY-MM-DD
  const to_date = searchParams.get("to_date"); // YYYY-MM-DD

  if (building) {
    values.push(building);
    where.push(`building = $${values.length}`);
  }
  if (floor) {
    values.push(floor);
    where.push(`floor = $${values.length}`);
  }
  if (area_id) {
    values.push(Number(area_id));
    where.push(`area_id = $${values.length}`);
  }
  if (complaint_type_id) {
    values.push(Number(complaint_type_id));
    where.push(`complaint_type_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }
  if (from_date) {
    values.push(from_date);
    where.push(`date >= $${values.length}`);
  }
  if (to_date) {
    // include end of day by adding 1 day
    values.push(to_date + " 23:59:59");
    where.push(`date <= $${values.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { whereClause, values };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.permissions, "dashboard:view")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const { whereClause, values } = buildFilters(searchParams);

    // Metrics queries 
    const queries = {
      total: `SELECT COUNT(*)::int AS count FROM complaints ${whereClause};`,
      open: `SELECT COUNT(*)::int AS count FROM complaints ${whereClause ? whereClause + ' AND' : 'WHERE'} COALESCE(status,'') <> 'Resolved';`,
      createdThisMonth: `SELECT COUNT(*)::int AS count FROM complaints ${whereClause ? whereClause + ' AND' : 'WHERE'} DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);`,
      inProgress: `SELECT COUNT(*)::int AS count FROM complaints ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'In-Progress';`,
      unseen: `SELECT COUNT(*)::int AS count FROM complaints ${whereClause ? whereClause + ' AND' : 'WHERE'} seen = false;`,
      resolvedThisMonth: `SELECT COUNT(*)::int AS count FROM complaints ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'Resolved' AND DATE_TRUNC('month', resolution_date) = DATE_TRUNC('month', CURRENT_DATE);`,
      avgResolutionDays: `SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolution_date - date)) / 86400)::numeric, 1), 0) AS days FROM complaints ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'Resolved' AND resolution_date IS NOT NULL;`,
      byStatus: `SELECT COALESCE(status,'Unspecified') AS key, COUNT(*)::int AS value FROM complaints ${whereClause} GROUP BY COALESCE(status,'Unspecified') ORDER BY value DESC;`,
      byType: `SELECT COALESCE(ct.type_name,'Deleted Type') AS key, COUNT(*)::int AS value FROM complaints c LEFT JOIN complaint_types ct ON ct.id = c.complaint_type_id ${whereClause ? whereClause : ''} GROUP BY COALESCE(ct.type_name,'Deleted Type') ORDER BY value DESC;`,
      byDate: `WITH days AS (
                SELECT generate_series((CURRENT_DATE - INTERVAL '29 days')::date, CURRENT_DATE::date, '1 day')::date AS d
              )
              SELECT d AS key, COALESCE(c.count,0)::int AS value
              FROM days
              LEFT JOIN (
                SELECT DATE_TRUNC('day', date)::date AS dd, COUNT(*)::int AS count
                FROM complaints ${whereClause}
                GROUP BY dd
              ) c ON c.dd = days.d
              ORDER BY key;`,
      recent: `SELECT c.id, c.date, c.building, c.floor, c.area_id, a.area_name,
                      c.complaint_type_id, ct.type_name AS complaint_type_name, c.status
                 FROM complaints c
                 LEFT JOIN areas a ON c.area_id = a.id
                 LEFT JOIN complaint_types ct ON c.complaint_type_id = ct.id
                 ${whereClause}
                 ORDER BY c.date DESC
                 LIMIT 10;`
    } as const;

    // Execute queries with shared values. Some queries append extra conditions after whereClause;
    // for those, we reuse the same params array.
    const client = await pool.connect();
    try {
      const [total, open, createdThisMonth, inProgress, unseen, resolvedThisMonth, avgResolutionDays, byStatus, byType, byDate, recent] = await Promise.all([
        client.query(queries.total, values),
        client.query(queries.open, values),
        client.query(queries.createdThisMonth, values),
        client.query(queries.inProgress, values),
        client.query(queries.unseen, values),
        client.query(queries.resolvedThisMonth, values),
        client.query(queries.avgResolutionDays, values),
        client.query(queries.byStatus, values),
        client.query(queries.byType, values),
        client.query(queries.byDate, values),
        client.query(queries.recent, values),
      ]);

      const data = {
        counts: {
          total: total.rows[0]?.count ?? 0,
          open: open.rows[0]?.count ?? 0,
          createdThisMonth: createdThisMonth.rows[0]?.count ?? 0,
          inProgress: inProgress.rows[0]?.count ?? 0,
          unseen: unseen.rows[0]?.count ?? 0,
          resolvedThisMonth: resolvedThisMonth.rows[0]?.count ?? 0,
        },
        avgResolutionDays: Number(avgResolutionDays.rows[0]?.days ?? 0),
        series: {
          byStatus: byStatus.rows, // [{ key, value }]
          byType: byType.rows,     // [{ key, value }]
          byDate: byDate.rows.map((r: any) => ({ key: r.key.toISOString().slice(0,10), value: r.value })),
        },
        recent: recent.rows,
      };

      return NextResponse.json(data);
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("/api/dashboard error", error);
    return NextResponse.json({ error: (error as Error)?.message || "Internal Server Error" }, { status: 500 });
  }
}