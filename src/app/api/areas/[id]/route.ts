import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from 'next/server';
import { hasPermission } from "@/lib/permissions";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;
        if (!session || !hasPermission(session.user.permissions, "areas:manage")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const areaId = Number(id);
        if (isNaN(areaId)) {
            return NextResponse.json({ error: "Invalid area ID" }, { status: 400 });
        }

        const res = await pool.query("DELETE FROM areas WHERE id = $1 RETURNING *", [areaId]);
        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Area deleted successfully" });
    } catch (error) {
        console.error("Error deleting area:", error);
        return NextResponse.json({ error: "Error deleting area" }, { status: 500 });
    }
}


export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.permissions, "areas:manage")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { name } = await request.json();
        const {id} = await params;
        const res = await pool.query("UPDATE areas SET area_name = $1 WHERE id = $2 RETURNING *", [name, id]);
        if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Error updating area:", error);
        return NextResponse.json({ error: "Error updating area" }, { status: 500 });
    }
}
