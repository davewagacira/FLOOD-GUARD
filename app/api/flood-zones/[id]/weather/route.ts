// GET  /api/flood-zones/[id]/weather  — get or refresh weather for a single zone
// POST /api/flood-zones/[id]/weather  — force-refresh weather for this zone

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { aggregateWeather } from "@/lib/weather/weather-aggregator";
import { calculateFloodRisk } from "@/lib/flood-risk/risk-engine";
import { requireRole, requireUser } from "@/lib/server-auth";

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const auth = await requireUser(_req);
    if (auth.error) return auth.error;

    const params = await props.params;
    const zone = await prisma.floodZone.findUnique({
        where: { id: params.id },
        include: { location: true },
    });

    if (!zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });

    // Latest snapshot within the hour
    const snapshot = await prisma.normalizedWeatherSnapshot.findFirst({
        where: {
            locationId: zone.locationId,
            snapshotAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
        },
        orderBy: { snapshotAt: "desc" },
    });

    // Latest assessment
    const assessment = await prisma.floodRiskAssessment.findFirst({
        where: { floodZoneId: zone.id },
        orderBy: { assessedAt: "desc" },
    });

    return NextResponse.json({ zone, snapshot, assessment });
}

export async function POST(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const auth = await requireRole(_req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    const params = await props.params;
    const zone = await prisma.floodZone.findUnique({
        where: { id: params.id },
        include: { location: true },
    });

    if (!zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });

    const { location } = zone;
    const weather = await aggregateWeather(location.latitude, location.longitude);
    if (!weather) return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });

    // Store snapshot
    const snapshot = await prisma.normalizedWeatherSnapshot.create({
        data: {
            locationId: location.id,
            snapshotAt: new Date(),
            precipitationIntensity: weather.precipitationIntensity,
            precipitationProbability: weather.precipitationProbability,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed,
            temperature: weather.temperature,
            confidenceScore: weather.confidenceScore,
            tomorrowPayload: weather.tomorrowPayload ?? undefined,
            openweatherPayload: weather.openweatherPayload ?? undefined,
        },
    });

    // Calculate risk
    const risk = calculateFloodRisk({
        precipitationIntensity: weather.precipitationIntensity,
        precipitationProbability: weather.precipitationProbability,
        riverProximityKm: zone.riverProximityKm,
        drainageScore: zone.drainageScore,
        historicalFloodScore: zone.historicalFloodScore,
        elevationM: zone.elevationM,
    });

    // Store assessment
    const assessment = await prisma.floodRiskAssessment.create({
        data: {
            locationId: location.id,
            floodZoneId: zone.id,
            snapshotId: snapshot.id,
            riskScore: risk.riskScore,
            riskLevel: risk.riskLevel,
            rainfallScore: risk.rainfallScore,
            riverScore: risk.riverScore,
            drainageScore: risk.drainageScore,
            historicalScore: risk.historicalScore,
            elevationScore: risk.elevationScore,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
    });

    // Update zone risk level
    await prisma.floodZone.update({
        where: { id: zone.id },
        data: { riskLevel: risk.riskLevel },
    });

    return NextResponse.json({ snapshot, assessment, riskLevel: risk.riskLevel });
}
