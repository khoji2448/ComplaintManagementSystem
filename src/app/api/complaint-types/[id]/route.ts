import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/permissions";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const {id} = await params;
    if (!session || !hasPermission(session.user.permissions, "complaint_types:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  
    try {
      const { name } = await req.json();
      const res = await pool.query("UPDATE complaint_types SET type_name = $1 WHERE id = $2 RETURNING *", [name, id]);
      if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(res.rows[0]);
    } catch (error) {
      console.error("Error updating complaint type:", error);
      return NextResponse.json({ error: "Error updating complaint type" }, { status: 500 });
    }
  }
  
  export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const {id} = await params;
    if (!session || !hasPermission(session.user.permissions, "complaint_types:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  
    try {
      const complaintTypeId = Number(id);
    if (isNaN(complaintTypeId)) {
      return NextResponse.json({ error: "Invalid complaint type ID" }, { status: 400 });
    }
      const res = await pool.query("DELETE FROM complaint_types WHERE id = $1 RETURNING *", [complaintTypeId]);
      if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ message: "Complaint type deleted successfully" });
    } catch (error) {
      return NextResponse.json({ error: "Error deleting complaint type" + error }, { status: 500 });
    }
  }
  