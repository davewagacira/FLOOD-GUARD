// GET /api/system-health — real health checks + SMS stats from Neon DB
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    const [healthChecks, smsStats] = await Promise.all([
        prisma.systemHealthCheck.findMany({
            orderBy: { checkedAt: "desc" },
            distinct: ["service"],
            take: 10,
        }),
        prisma.smsMessage.groupBy({
            by: ["status"],
            where: { direction: "OUTBOUND" },
            _count: true,
        }),
    ]);
    return NextResponse.json({ healthChecks, smsStats });
}
