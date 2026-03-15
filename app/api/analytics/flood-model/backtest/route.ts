import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const POSITIVE_LEVELS = new Set<RiskLevel>(["HIGH", "CRITICAL"]);

function average(values: number[]) {
    return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function GET(req: NextRequest) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    const url = new URL(req.url);
    const limit = Math.min(250, Math.max(20, Number(url.searchParams.get("limit") ?? 100)));
    const lookbackHours = Math.min(72, Math.max(1, Number(url.searchParams.get("lookbackHours") ?? 24)));
    const predictedThreshold = (url.searchParams.get("predictedThreshold") ?? "HIGH").toUpperCase() as RiskLevel;
    const predictedPositiveLevels = predictedThreshold === "CRITICAL"
        ? new Set<RiskLevel>(["CRITICAL"])
        : predictedThreshold === "MEDIUM"
            ? new Set<RiskLevel>(["MEDIUM", "HIGH", "CRITICAL"])
            : POSITIVE_LEVELS;

    const incidents = await prisma.incident.findMany({
        where: {
            locationId: { not: null },
            verificationStatus: { in: ["CONFIRMED_DISASTER", "FALSE_ALARM"] },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            title: true,
            locationId: true,
            verificationStatus: true,
            severity: true,
            createdAt: true,
            roadPassability: true,
            observedWaterDepthCm: true,
        },
    });

    const evaluations = await Promise.all(incidents.map(async (incident) => {
        const windowStart = new Date(incident.createdAt.getTime() - lookbackHours * 60 * 60 * 1000);
        const assessment = await prisma.floodRiskAssessment.findFirst({
            where: {
                locationId: incident.locationId ?? undefined,
                assessedAt: {
                    lte: incident.createdAt,
                    gte: windowStart,
                },
            },
            orderBy: { assessedAt: "desc" },
            select: {
                id: true,
                riskScore: true,
                riskLevel: true,
                assessedAt: true,
                rainfallScore: true,
                accumulationScore: true,
                forecastScore: true,
                dataQualityScore: true,
            },
        });

        const actualPositive = incident.verificationStatus === "CONFIRMED_DISASTER";
        const predictedPositive = assessment ? predictedPositiveLevels.has(assessment.riskLevel as RiskLevel) : false;
        const leadMinutes = assessment ? Math.round((incident.createdAt.getTime() - assessment.assessedAt.getTime()) / 60000) : null;

        return {
            incidentId: incident.id,
            incidentTitle: incident.title,
            actual: incident.verificationStatus,
            predicted: assessment?.riskLevel ?? "NO_SIGNAL",
            predictedScore: assessment?.riskScore ?? null,
            leadMinutes,
            matchedAssessmentId: assessment?.id ?? null,
            actualPositive,
            predictedPositive,
            severity: incident.severity,
            roadPassability: incident.roadPassability,
            observedWaterDepthCm: incident.observedWaterDepthCm,
        };
    }));

    const truePositives = evaluations.filter((entry) => entry.actualPositive && entry.predictedPositive).length;
    const falsePositives = evaluations.filter((entry) => !entry.actualPositive && entry.predictedPositive).length;
    const falseNegatives = evaluations.filter((entry) => entry.actualPositive && !entry.predictedPositive).length;
    const trueNegatives = evaluations.filter((entry) => !entry.actualPositive && !entry.predictedPositive).length;

    const precision = truePositives + falsePositives === 0 ? null : truePositives / (truePositives + falsePositives);
    const recall = truePositives + falseNegatives === 0 ? null : truePositives / (truePositives + falseNegatives);
    const accuracy = evaluations.length === 0 ? null : (truePositives + trueNegatives) / evaluations.length;
    const avgLeadMinutes = average(evaluations.map((entry) => entry.leadMinutes).filter((value): value is number => value !== null));
    const avgPredictedScore = average(evaluations.map((entry) => entry.predictedScore).filter((value): value is number => value !== null));

    return NextResponse.json({
        params: { limit, lookbackHours, predictedThreshold },
        sampleSize: evaluations.length,
        metrics: {
            precision,
            recall,
            accuracy,
            truePositives,
            falsePositives,
            falseNegatives,
            trueNegatives,
            avgLeadMinutes,
            avgPredictedScore,
        },
        evaluations,
    });
}
