import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    const signals = await prisma.distressSignal.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
            location: { select: { id: true, name: true, county: true } },
            incident: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    severity: true,
                },
            },
        },
    });

    return NextResponse.json(signals);
}
