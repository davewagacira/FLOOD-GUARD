// GET /api/organizations — real orgs from Neon DB
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    const orgs = await prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { users: true, floodZones: true } },
        },
    });
    return NextResponse.json(orgs);
}
