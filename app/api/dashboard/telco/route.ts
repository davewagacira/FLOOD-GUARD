// GET /api/dashboard/telco
// Returns live Telco/SMS dashboard metrics

import { NextResponse } from "next/server";
import { getTelcoDashboardMetrics } from "@/server/repositories/dashboard.repository";

export async function GET() {
    try {
        const data = await getTelcoDashboardMetrics();
        return NextResponse.json(data);
    } catch (err) {
        console.error("[API /dashboard/telco]", err);
        return NextResponse.json(
            { error: "Failed to fetch Telco metrics" },
            { status: 500 }
        );
    }
}
