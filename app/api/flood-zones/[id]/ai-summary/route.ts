import { NextRequest, NextResponse } from 'next/server';

import { analyzeFloodRisk } from '@/lib/ai/vertex';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/server-auth';

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

  const aiSummary = await analyzeFloodRisk({
    zoneName: zone.name,
    riskLevel: latestAssessment?.riskLevel ?? zone.riskLevel,
    riskScore: latestAssessment?.riskScore ?? 0,
    precipitationMm: latestWeather?.precipitationIntensity ?? 0,
    riverProximityKm: zone.riverProximityKm,
    drainageScore: zone.drainageScore,
    historicalFloodScore: zone.historicalFloodScore,
    populationAtRisk: zone.population ?? zone.location.population ?? 0,
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
      weatherSnapshotAt: latestWeather?.snapshotAt ?? null,
      assessedAt: latestAssessment?.assessedAt ?? null,
    },
  });
}
