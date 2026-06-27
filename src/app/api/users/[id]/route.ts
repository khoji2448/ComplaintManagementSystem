import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
// import bcrypt from "bcryptjs";
import { hasPermission } from "@/lib/permissions";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.permissions, "users:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const data = await req.json();
    const { name, email, password, role } = data;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }

    const roleCheck = await pool.query("SELECT 1 FROM roles WHERE name = $1", [role]);
    if ((roleCheck.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Build the query dynamically based on whether password is provided
    let query;
    let queryParams;

    if (password) {
      // const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE users 
        SET name = $1, 
            email = $2, 
            password = $3, 
            role = $4
        WHERE id = $5
        RETURNING id, name, email, password, role
      `;
      queryParams = [name, email, password, role, id];
    } else {
      query = `
        UPDATE users 
        SET name = $1, 
            email = $2, 
            role = $3
        WHERE id = $4
        RETURNING id, name, email, password, role
      `;
      queryParams = [name, email, role, id];
    }

    const result = await pool.query(query, queryParams);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Error updating user: " + error }, { status: 500 });
  }
}
  
  export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const {id} = await params;
    if (!session || !hasPermission(session.user.permissions, "users:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  
    try {
      const userId = Number(id); 
  
      if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }
  
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
      return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
      return NextResponse.json({ error: "Error deleting user" + error }, { status: 500 });
    }
  }
  