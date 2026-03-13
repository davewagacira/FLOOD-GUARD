// GET /api/dashboard/admin
// Returns live admin dashboard metrics from Neon PostgreSQL

import { NextResponse } from "next/server";
import { getAdminDashboardMetrics } from "@/server/repositories/dashboard.repository";

export async function GET() {
    try {
        const data = await getAdminDashboardMetrics();
        return NextResponse.json(data);
    } catch (err) {
        console.error("[API /dashboard/admin]", err);
        return NextResponse.json(
            { error: "Failed to fetch admin metrics" },
            { status: 500 }
        );
    }
}
