import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    const providers = await prisma.weatherProviderConfig.findMany({
        orderBy: { provider: "asc" },
        select: {
            id: true,
            provider: true,
            isActive: true,
            isPrimary: true,
            timeoutMs: true,
            maxRetries: true,
            consecutiveFailures: true,
            successCount: true,
            failureCount: true,
            circuitState: true,
            cooldownUntil: true,
            lastCheckedAt: true,
            lastSuccessfulAt: true,
            lastFailureAt: true,
            lastError: true,
        },
    });

    return NextResponse.json(providers);
}
