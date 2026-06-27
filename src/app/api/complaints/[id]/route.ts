import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.permissions, "complaints:action")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const {id} = await params;
    const body = await req.json();
    if (!body.resolution_date || !body.action) {
      return NextResponse.json({ error: "resolution_date and action are required" }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE complaints
       SET resolution_date = $1,
           status = 'Resolved',
           action = $2
       WHERE id = $3
       RETURNING *`,
      [body.resolution_date,body.action, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);

  }catch (error) {
    return NextResponse.json({ error: "Error updating complaint" + error }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const data = await req.json();
    const { date, building, floor, area_id, complaint_type_id, details } = data;

    const query = `
      UPDATE complaints 
      SET date = $1, 
          building = $2, 
          floor = $3, 
          area_id = $4, 
          complaint_type_id = $5, 
          details = $6 
      WHERE id = $7 AND user_id = $8 
      RETURNING *
    `;
    
    const res = await pool.query(query, [date,building,floor,area_id,complaint_type_id,details,id,session.user.id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Error updating complaint" + error }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const {id} = await params;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const res = await pool.query("DELETE FROM complaints WHERE id = $1 AND user_id = $2 RETURNING *", [
      id,
      session.user.id,
    ]);

    if (res.rowCount === 0) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 403 });

    return NextResponse.json({ message: "Complaint deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting complaint" + error }, { status: 500 });
  }
}