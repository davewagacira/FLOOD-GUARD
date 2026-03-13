// GET /api/flood-zones — real flood zones from Neon DB
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireUser } from "@/lib/server-auth";

export async function GET(req: Request) {
    const auth = await requireUser(req as any);
    if (auth.error) return auth.error;

    const zones = await prisma.floodZone.findMany({
        orderBy: [{ riskLevel: "desc" }, { name: "asc" }],
        include: {
            location: { select: { name: true, county: true, latitude: true, longitude: true, population: true } },
            assessments: { take: 1, orderBy: { assessedAt: "desc" } },
        },
    });
    return NextResponse.json(zones);
}

export async function POST(req: Request) {
    try {
        const auth = await requireRole(req as any, ["ADMIN"]);
        if (auth.error) return auth.error;

        const body = await req.json();
        const { name, code, county, population, polygonCoordinates, latitude, longitude } = body;

        const location = await prisma.location.create({
            data: {
                name: `${name} Location`,
                county: county,
                latitude,
                longitude,
                population: Number(population) || 0,
            }
        });

        const zone = await prisma.floodZone.create({
            data: {
                name,
                code,
                organizationId: auth.user.organizationId,
                locationId: location.id,
                polygonCoordinates,
                population: Number(population) || 0,
                riskLevel: "LOW"
            }
        });

        return NextResponse.json(zone, { status: 201 });
    } catch (error: any) {
        console.error("Error creating flood zone:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
