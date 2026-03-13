// GET /api/flood-zones/map
// Returns flood zones with latest risk assessments AND latest weather snapshots
// Used by the flood map page for full live data

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/server-auth";

export async function GET(req: Request) {
    const auth = await requireUser(req as any);
    if (auth.error) return auth.error;

    const now = new Date();
    const freshSnapshotCutoff = new Date(Date.now() - 90 * 60 * 1000);

    const zones = await prisma.floodZone.findMany({
        where: { isActive: true },
        orderBy: [{ riskLevel: "desc" }, { name: "asc" }],
        include: {
            location: {
                select: {
                    id: true,
                    name: true,
                    county: true,
                    latitude: true,
                    longitude: true,
                    population: true,
                },
            },
            // Latest risk assessment
            assessments: {
                take: 1,
                orderBy: { assessedAt: "desc" },
                where: {
                    expiresAt: { gt: now },
                },
                select: {
                    riskScore: true,
                    riskLevel: true,
                    rainfallScore: true,
                    riverScore: true,
                    drainageScore: true,
                    assessedAt: true,
                },
            },
        },
    });

    // Enrich each zone with its location's latest weather snapshot
    const enriched = await Promise.all(
        zones.map(async (zone) => {
            const weatherSnapshot = await prisma.normalizedWeatherSnapshot.findFirst({
                where: {
                    locationId: zone.location.id,
                    snapshotAt: { gte: freshSnapshotCutoff },
                },
                orderBy: { snapshotAt: "desc" },
                select: {
                    temperature: true,
                    humidity: true,
                    precipitationIntensity: true,
                    precipitationProbability: true,
                    windSpeed: true,
                    confidenceScore: true,
                    snapshotAt: true,
                },
            });

            return {
                ...zone,
                weatherSnapshot: weatherSnapshot ?? null,
                riskDataFresh: zone.assessments.length > 0,
                weatherDataFresh: Boolean(weatherSnapshot),
            };
        })
    );

    return NextResponse.json(enriched);
}
