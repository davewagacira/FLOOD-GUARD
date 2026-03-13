import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { getNgoDashboardMetrics } from "@/server/repositories/dashboard.repository";

export async function GET(req: NextRequest) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    try {
        const organizationId = auth.user.role === "DISASTER_MANAGER" ? auth.user.organizationId : undefined;
        const data = await getNgoDashboardMetrics(organizationId);
        return NextResponse.json(data);
    } catch (err) {
        console.error("[API /dashboard/ngo]", err);
        return NextResponse.json(
            { error: "Failed to fetch disaster management metrics." },
            { status: 500 },
        );
    }
}
