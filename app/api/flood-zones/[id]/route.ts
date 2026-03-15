// PATCH /api/flood-zones/[id] — update zone metadata / polygon / risk level
// DELETE /api/flood-zones/[id] — remove zone

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireUser } from "@/lib/server-auth";

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireRole(req, ["ADMIN"]);
        if (auth.error) return auth.error;

        const params = await props.params;
        const body = await req.json();

        const zone = await prisma.floodZone.update({
            where: { id: params.id },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.riskLevel !== undefined && { riskLevel: body.riskLevel }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
                ...(body.population !== undefined && { population: body.population }),
                ...(body.drainageScore !== undefined && { drainageScore: body.drainageScore }),
                ...(body.riverProximityKm !== undefined && { riverProximityKm: body.riverProximityKm }),
                ...(body.historicalFloodScore !== undefined && { historicalFloodScore: body.historicalFloodScore }),
                ...(body.currentRainThresholdMmHr !== undefined && { currentRainThresholdMmHr: body.currentRainThresholdMmHr }),
                ...(body.rain1hThresholdMm !== undefined && { rain1hThresholdMm: body.rain1hThresholdMm }),
                ...(body.rain3hThresholdMm !== undefined && { rain3hThresholdMm: body.rain3hThresholdMm }),
                ...(body.rain24hThresholdMm !== undefined && { rain24hThresholdMm: body.rain24hThresholdMm }),
                ...(body.forecast6hThresholdMm !== undefined && { forecast6hThresholdMm: body.forecast6hThresholdMm }),
                ...(body.forecast24hThresholdMm !== undefined && { forecast24hThresholdMm: body.forecast24hThresholdMm }),
                ...(body.triggerProbabilityThreshold !== undefined && { triggerProbabilityThreshold: body.triggerProbabilityThreshold }),
                ...(body.minOperationalConfidence !== undefined && { minOperationalConfidence: body.minOperationalConfidence }),
                ...(body.polygonCoordinates !== undefined && { polygonCoordinates: body.polygonCoordinates }),
            },
            include: {
                location: { select: { name: true, county: true, latitude: true, longitude: true } },
            },
        });

        return NextResponse.json(zone);
    } catch (e) {
        console.error("[PATCH /flood-zones/[id]]", e);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireRole(_req, ["ADMIN"]);
        if (auth.error) return auth.error;

        const params = await props.params;
        await prisma.floodZone.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[DELETE /flood-zones/[id]]", e);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const auth = await requireUser(_req);
    if (auth.error) return auth.error;

    const params = await props.params;
    const zone = await prisma.floodZone.findUnique({
        where: { id: params.id },
        include: {
            location: true,
            assessments: { take: 1, orderBy: { assessedAt: "desc" } },
        },
    });
    if (!zone) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(zone);
}
