// GET /api/alerts — real alerts from Neon DB
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    const alerts = await prisma.alert.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            location: { select: { name: true, county: true } },
            organization: { select: { name: true } },
        },
    });
    return NextResponse.json(alerts);
}
