// GET /api/dashboard/telco
// Returns live Telco/SMS dashboard metrics

import { NextResponse } from "next/server";
import { getTelcoDashboardMetrics } from "@/server/repositories/dashboard.repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    try {
        const data = await getTelcoDashboardMetrics();
        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        });
    } catch (err) {
        console.error("[API /dashboard/telco]", err);
        return NextResponse.json(
            { error: "Failed to fetch Telco metrics" },
            { status: 500 }
        );
    }
}
