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
    const freshAssessmentCutoff = new Date(Date.now() - 90 * 60 * 1000);

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
                select: {
                    riskScore: true,
                    riskLevel: true,
                    rainfallScore: true,
                    accumulationScore: true,
                    forecastScore: true,
                    riverScore: true,
                    drainageScore: true,
                    dataQualityScore: true,
                    assessedAt: true,
                    expiresAt: true,
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
                    tomorrowPayload: true,
                    openweatherPayload: true,
                },
            });

            return {
                ...zone,
                weatherSnapshot: weatherSnapshot ?? null,
                riskDataFresh: Boolean(
                    zone.assessments[0] &&
                    new Date(zone.assessments[0].assessedAt) >= freshAssessmentCutoff &&
                    new Date(zone.assessments[0].expiresAt) > now
                ),
                weatherDataFresh: Boolean(
                    weatherSnapshot &&
                    new Date(weatherSnapshot.snapshotAt) >= freshSnapshotCutoff
                ),
            };
        })
    );

    return NextResponse.json(enriched);
}
