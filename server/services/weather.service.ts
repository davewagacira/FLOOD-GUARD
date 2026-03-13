// Weather Ingestion Service
// Fetches weather for all active locations, normalizes, stores snapshot,
// then triggers flood risk assessment

import { prisma } from "@/lib/db/prisma";
import { aggregateWeather } from "@/lib/weather/weather-aggregator";
import { calculateFloodRisk } from "@/lib/flood-risk/risk-engine";

export interface WeatherIngestResult {
    processed: number;
    failed: number;
    highRiskZones: string[];
}

export async function ingestWeatherForAllLocations(): Promise<WeatherIngestResult> {
    // Get all active flood zones with location data
    const floodZones = await prisma.floodZone.findMany({
        where: { isActive: true },
        include: { location: true },
    });

    const result: WeatherIngestResult = {
        processed: 0,
        failed: 0,
        highRiskZones: [],
    };

    // Process each flood zone
    await Promise.allSettled(
        floodZones.map(async (zone) => {
            try {
                const { location } = zone;

                // 1. Fetch + normalize weather
                const weather = await aggregateWeather(location.latitude, location.longitude);
                if (!weather) {
                    result.failed++;
                    return;
                }

                // 2. Store normalized snapshot
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

                // 3. Calculate flood risk
                const risk = calculateFloodRisk({
                    precipitationIntensity: weather.precipitationIntensity,
                    precipitationProbability: weather.precipitationProbability,
                    riverProximityKm: zone.riverProximityKm,
                    drainageScore: zone.drainageScore,
                    historicalFloodScore: zone.historicalFloodScore,
                    elevationM: zone.elevationM,
                });

                // 4. Store risk assessment (expires in 1 hour)
                const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
                await prisma.floodRiskAssessment.create({
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
                        expiresAt,
                    },
                });

                // 5. Update flood zone risk level in DB
                await prisma.floodZone.update({
                    where: { id: zone.id },
                    data: { riskLevel: risk.riskLevel },
                });

                if (risk.riskLevel === "HIGH" || risk.riskLevel === "CRITICAL") {
                    result.highRiskZones.push(`${zone.name} (${risk.riskLevel}: ${risk.riskScore})`);
                }

                result.processed++;
            } catch (err) {
                console.error(`[WeatherIngest] Failed for zone ${zone.name}:`, err);
                result.failed++;
            }
        })
    );

    return result;
}

/**
 * Get latest weather snapshot for a location
 */
export async function getLatestWeatherSnapshot(locationId: string) {
    return prisma.normalizedWeatherSnapshot.findFirst({
        where: { locationId },
        orderBy: { snapshotAt: "desc" },
    });
}

/**
 * Get latest risk assessment for a flood zone
 */
export async function getLatestRiskAssessment(floodZoneId: string) {
    return prisma.floodRiskAssessment.findFirst({
        where: {
            floodZoneId,
            expiresAt: { gt: new Date() },
        },
        orderBy: { assessedAt: "desc" },
    });
}
