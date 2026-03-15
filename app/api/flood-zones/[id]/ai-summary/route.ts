import { NextRequest, NextResponse } from 'next/server';

import { analyzeFloodRisk } from '@/lib/ai/vertex';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/server-auth';
import { extractAggregationMetadataFromPayload, extractDerivedMetricsFromPayload } from '@/lib/weather/derived-metrics';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ['ADMIN', 'DISASTER_MANAGER']);
  if (auth.error) return auth.error;

  const params = await props.params;
  const zone = await prisma.floodZone.findUnique({
    where: { id: params.id },
    include: {
      location: true,
      assessments: {
        take: 1,
        orderBy: { assessedAt: 'desc' },
      },
    },
  });

  if (!zone) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }

  const latestAssessment = zone.assessments[0] ?? null;
  const latestWeather = await prisma.normalizedWeatherSnapshot.findFirst({
    where: { locationId: zone.locationId },
    orderBy: { snapshotAt: 'desc' },
  });

  if (!latestAssessment && !latestWeather) {
    return NextResponse.json(
      { error: 'No weather snapshot or risk assessment is available for this zone yet.' },
      { status: 409 }
    );
  }

  const tomorrowDerived = extractDerivedMetricsFromPayload(latestWeather?.tomorrowPayload);
  const openweatherDerived = extractDerivedMetricsFromPayload(latestWeather?.openweatherPayload);
  const tomorrowAggregation = extractAggregationMetadataFromPayload(latestWeather?.tomorrowPayload);
  const openweatherAggregation = extractAggregationMetadataFromPayload(latestWeather?.openweatherPayload);

  const mergedDerived = {
    rainLast1h: tomorrowDerived.rainLast1h ?? openweatherDerived.rainLast1h,
    rainLast3h: tomorrowDerived.rainLast3h ?? openweatherDerived.rainLast3h,
    rainLast24h: tomorrowDerived.rainLast24h ?? openweatherDerived.rainLast24h,
    forecastRainNext6h: tomorrowDerived.forecastRainNext6h ?? openweatherDerived.forecastRainNext6h,
    forecastRainNext24h: tomorrowDerived.forecastRainNext24h ?? openweatherDerived.forecastRainNext24h,
    forecastProbabilityMaxNext6h: tomorrowDerived.forecastProbabilityMaxNext6h ?? openweatherDerived.forecastProbabilityMaxNext6h,
    forecastProbabilityMaxNext24h: tomorrowDerived.forecastProbabilityMaxNext24h ?? openweatherDerived.forecastProbabilityMaxNext24h,
  };

  const operationalConfidence =
    tomorrowAggregation.operationalConfidenceScore ?? openweatherAggregation.operationalConfidenceScore ?? null;
  const dataFreshness =
    latestWeather?.snapshotAt
      ? Date.now() - new Date(latestWeather.snapshotAt).getTime() <= 1000 * 60 * 90
        ? 'fresh'
        : 'stale'
      : 'unknown';

  const aiSummary = await analyzeFloodRisk({
    zoneName: zone.name,
    county: zone.location.county,
    subCounty: zone.location.subCounty,
    ward: zone.location.ward,
    riskLevel: latestAssessment?.riskLevel ?? zone.riskLevel,
    riskScore: latestAssessment?.riskScore ?? 0,
    precipitationMm: latestWeather?.precipitationIntensity ?? 0,
    precipitationProbability: latestWeather?.precipitationProbability ?? null,
    rainLast1h: mergedDerived.rainLast1h,
    rainLast3h: mergedDerived.rainLast3h,
    rainLast24h: mergedDerived.rainLast24h,
    forecastRainNext6h: mergedDerived.forecastRainNext6h,
    forecastRainNext24h: mergedDerived.forecastRainNext24h,
    forecastProbabilityMaxNext6h: mergedDerived.forecastProbabilityMaxNext6h,
    forecastProbabilityMaxNext24h: mergedDerived.forecastProbabilityMaxNext24h,
    operationalConfidence,
    dataFreshness,
    riverProximityKm: zone.riverProximityKm,
    drainageScore: zone.drainageScore,
    historicalFloodScore: zone.historicalFloodScore,
    populationAtRisk: zone.population ?? zone.location.population ?? 0,
    rainfallScore: latestAssessment?.rainfallScore ?? null,
    accumulationScore: latestAssessment?.accumulationScore ?? null,
    forecastScore: latestAssessment?.forecastScore ?? null,
    riverScore: latestAssessment?.riverScore ?? null,
    drainageRiskScore: latestAssessment?.drainageScore ?? null,
    dataQualityScore: latestAssessment?.dataQualityScore ?? null,
  });

  return NextResponse.json({
    zoneId: zone.id,
    zoneName: zone.name,
    generatedAt: new Date().toISOString(),
    summary: aiSummary.summary,
    recommendations: aiSummary.recommendations,
    confidence: aiSummary.confidence,
    context: {
      riskLevel: latestAssessment?.riskLevel ?? zone.riskLevel,
      riskScore: latestAssessment?.riskScore ?? null,
      precipitationIntensity: latestWeather?.precipitationIntensity ?? null,
      precipitationProbability: latestWeather?.precipitationProbability ?? null,
      rainLast1h: mergedDerived.rainLast1h,
      rainLast3h: mergedDerived.rainLast3h,
      rainLast24h: mergedDerived.rainLast24h,
      forecastRainNext6h: mergedDerived.forecastRainNext6h,
      forecastRainNext24h: mergedDerived.forecastRainNext24h,
      operationalConfidence,
      dataFreshness,
      weatherSnapshotAt: latestWeather?.snapshotAt ?? null,
      assessedAt: latestAssessment?.assessedAt ?? null,
    },
  });
}
