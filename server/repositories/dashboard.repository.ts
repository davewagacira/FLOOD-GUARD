// Dashboard Data Repositories
// Live DB queries replacing all mock data

import { prisma } from "@/lib/db/prisma";
import { startOfDay, subDays } from "date-fns";
import { extractAggregationMetadataFromPayload, extractDerivedMetricsFromPayload } from "@/lib/weather/derived-metrics";

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────

export async function getAdminDashboardMetrics() {
    const now = new Date();
    const oneDayAgo = subDays(now, 1);
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    const [
        totalOrgs,
        totalUsers,
        activeFloodZones,
        highRiskZones,
        activeAlerts,
        smsSentToday,
        smsSentThisWeek,
        recentAuditLogs,
        latestHealthChecks,
        orgGrowthRaw,
        smsDailyRaw,
    ] = await Promise.all([
        // Total organizations
        prisma.organization.count({ where: { isActive: true } }),

        // Total users
        prisma.user.count({ where: { isActive: true } }),

        // Active flood zones
        prisma.floodZone.count({ where: { isActive: true } }),

        // High or critical risk zones (from assessments)
        prisma.floodZone.count({
            where: {
                isActive: true,
                riskLevel: { in: ["HIGH", "CRITICAL"] },
            },
        }),

        // Active alerts
        prisma.alert.count({
            where: { status: { in: ["PENDING_APPROVAL", "APPROVED", "SENDING"] } },
        }),

        // SMS sent today
        prisma.smsMessage.count({
            where: {
                direction: "OUTBOUND",
                createdAt: { gte: startOfDay(now) },
            },
        }),

        // SMS sent this week
        prisma.smsMessage.count({
            where: {
                direction: "OUTBOUND",
                createdAt: { gte: sevenDaysAgo },
            },
        }),

        // Recent audit logs
        prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true, email: true } } },
        }),

        // Latest health checks per service
        prisma.systemHealthCheck.findMany({
            orderBy: { checkedAt: "desc" },
            distinct: ["service"],
            take: 10,
        }),

        // Org growth last 6 months (grouped by month)
        prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
             COUNT(*) as count
      FROM organizations
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `,

        // Daily SMS for last 7 days
        prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'Dy') as day,
             COUNT(*) as count
      FROM sms_messages
      WHERE direction = 'OUTBOUND'
        AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt")
    `,
    ]);

    return {
        metrics: {
            totalOrgs,
            totalUsers,
            activeFloodZones,
            highRiskZones,
            activeAlerts,
            smsSentToday,
            smsSentThisWeek,
        },
        recentAuditLogs,
        latestHealthChecks,
        charts: {
            orgGrowth: orgGrowthRaw.map((r) => ({
                name: r.month,
                organizations: Number(r.count),
            })),
            smsDailyVolume: smsDailyRaw.map((r) => ({
                date: r.day,
                count: Number(r.count),
            })),
        },
    };
}

// ─── NGO / DISASTER MANAGEMENT DASHBOARD ─────────────────────────────────────

export async function getNgoDashboardMetrics(organizationId?: string) {
    const now = new Date();
    const oneDayAgo = subDays(now, 1);

    const orgFilter = organizationId ? { organizationId } : {};

    const [
        activeIncidents,
        distressSignals24h,
        unresolvedDistress,
        deployedTeams,
        highRiskZones,
        incidentsBySeverity,
        recentIncidents,
        recentDistress,
        floodZoneRisks,
    ] = await Promise.all([
        // Active incidents
        prisma.incident.count({
            where: {
                ...orgFilter,
                status: { in: ["OPEN", "IN_PROGRESS", "MONITORING"] },
            },
        }),

        // Distress signals in last 24h
        prisma.distressSignal.count({
            where: {
                createdAt: { gte: oneDayAgo },
            },
        }),

        // Unresolved distress signals
        prisma.distressSignal.count({
            where: {
                status: { in: ["RECEIVED", "ACKNOWLEDGED"] },
                signalType: "NEED_HELP",
            },
        }),

        // Active rescue deployments
        prisma.deployment.count({
            where: { status: { in: ["DISPATCHED", "EN_ROUTE", "ON_SITE"] } },
        }),

        // High/critical risk zones
        prisma.floodZone.count({
            where: {
                isActive: true,
                riskLevel: { in: ["HIGH", "CRITICAL"] },
            },
        }),

        // Incidents by severity (for chart)
        prisma.incident.groupBy({
            by: ["severity"],
            where: {
                ...orgFilter,
                status: { not: "CLOSED" },
            },
            _count: true,
        }),

        // Recent incidents with location
        prisma.incident.findMany({
            where: { ...orgFilter },
            take: 8,
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { distressSignals: true } },
            },
        }),

        // Recent distress signals
        prisma.distressSignal.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: { location: true },
        }),

        // Flood zones with current risk levels and latest assessment
        prisma.floodZone.findMany({
            where: { isActive: true },
            take: 20,
            orderBy: [{ riskLevel: "desc" }],
            include: {
                location: {
                    include: {
                        weatherSnapshots: {
                            take: 1,
                            orderBy: { snapshotAt: "desc" },
                        },
                    },
                },
                assessments: {
                    take: 1,
                    orderBy: { assessedAt: "desc" },
                },
            },
        }),
    ]);

    const incidentSeverityChart = incidentsBySeverity.map((item) => ({
        name: item.severity,
        count: item._count,
    }));

    const weatherAdvisories = floodZoneRisks
        .map((zone) => {
            const snapshot = zone.location.weatherSnapshots[0] ?? null;
            if (!snapshot) return null;

            const tomorrowDerived = extractDerivedMetricsFromPayload(snapshot.tomorrowPayload);
            const openweatherDerived = extractDerivedMetricsFromPayload(snapshot.openweatherPayload);
            const aggregation =
                extractAggregationMetadataFromPayload(snapshot.tomorrowPayload).operationalConfidenceScore ??
                extractAggregationMetadataFromPayload(snapshot.openweatherPayload).operationalConfidenceScore ??
                null;

            const rainLast1h = tomorrowDerived.rainLast1h ?? openweatherDerived.rainLast1h;
            const rainLast3h = tomorrowDerived.rainLast3h ?? openweatherDerived.rainLast3h;
            const rainLast24h = tomorrowDerived.rainLast24h ?? openweatherDerived.rainLast24h;
            const forecastRainNext6h = tomorrowDerived.forecastRainNext6h ?? openweatherDerived.forecastRainNext6h;
            const forecastRainNext24h = tomorrowDerived.forecastRainNext24h ?? openweatherDerived.forecastRainNext24h;
            const forecastProbabilityMaxNext6h =
                tomorrowDerived.forecastProbabilityMaxNext6h ?? openweatherDerived.forecastProbabilityMaxNext6h;
            const forecastProbabilityMaxNext24h =
                tomorrowDerived.forecastProbabilityMaxNext24h ?? openweatherDerived.forecastProbabilityMaxNext24h;

            const recentRainSeverity =
                ((rainLast1h ?? 0) >= 12 || (rainLast3h ?? 0) >= 30 || (rainLast24h ?? 0) >= 80) &&
                (zone.drainageScore <= 40 || zone.historicalFloodScore >= 65 || (zone.riverProximityKm ?? 99) <= 0.5)
                    ? "HIGH"
                    : ((rainLast1h ?? 0) >= 6 || (rainLast3h ?? 0) >= 18 || (rainLast24h ?? 0) >= 45) &&
                        (zone.drainageScore <= 50 || zone.historicalFloodScore >= 55 || (zone.riverProximityKm ?? 99) <= 1)
                        ? "MEDIUM"
                        : null;

            const forecastSeverity =
                (forecastRainNext6h ?? 0) >= 20 || (forecastProbabilityMaxNext6h ?? 0) >= 80
                    ? "HIGH"
                    : (forecastRainNext6h ?? 0) >= 10 || (forecastProbabilityMaxNext6h ?? 0) >= 60
                        ? "MEDIUM"
                        : (forecastRainNext24h ?? 0) >= 15 || (forecastProbabilityMaxNext24h ?? 0) >= 50
                            ? "WATCH"
                            : null;

            const severityRank = { HIGH: 3, MEDIUM: 2, WATCH: 1 } as const;
            const severityCandidates = [forecastSeverity, recentRainSeverity].filter((value): value is keyof typeof severityRank => value !== null);
            const advisorySeverity = severityCandidates.length === 0
                ? null
                : severityCandidates.sort((a, b) => severityRank[b] - severityRank[a])[0];

            if (!advisorySeverity) return null;

            const triggers: string[] = [];
            if (forecastSeverity) triggers.push("forecast signal");
            if (recentRainSeverity) triggers.push("recent rainfall + zone vulnerability");
            if (zone.drainageScore <= 35) triggers.push("poor drainage");
            if ((zone.riverProximityKm ?? 99) <= 0.5) triggers.push("river exposure");

            const summary =
                advisorySeverity === "HIGH"
                    ? "Heavy rain conditions or recent runoff pressure suggest the zone may deteriorate quickly."
                    : advisorySeverity === "MEDIUM"
                        ? "Weather and flood-vulnerability signals show a meaningful chance of near-term escalation."
                        : "Conditions should be watched because additional rain or runoff could worsen localized flooding.";

            return {
                zoneId: zone.id,
                zoneName: zone.name,
                county: zone.location.county,
                severity: advisorySeverity,
                summary,
                triggers,
                rainLast1h,
                rainLast3h,
                rainLast24h,
                forecastRainNext6h,
                forecastRainNext24h,
                forecastProbabilityMaxNext6h,
                forecastProbabilityMaxNext24h,
                currentIntensity: snapshot.precipitationIntensity,
                operationalConfidence: aggregation,
                snapshotAt: snapshot.snapshotAt,
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => {
            const severityRank = { HIGH: 3, MEDIUM: 2, WATCH: 1 };
            return (
                severityRank[b.severity as keyof typeof severityRank] - severityRank[a.severity as keyof typeof severityRank] ||
                (b.rainLast3h ?? 0) - (a.rainLast3h ?? 0) ||
                (b.forecastRainNext6h ?? 0) - (a.forecastRainNext6h ?? 0) ||
                (b.forecastProbabilityMaxNext6h ?? 0) - (a.forecastProbabilityMaxNext6h ?? 0)
            );
        })
        .slice(0, 5);

    return {
        metrics: {
            activeIncidents,
            distressSignals24h,
            unresolvedDistress,
            deployedTeams,
            highRiskZones,
        },
        incidentSeverityChart,
        recentIncidents,
        recentDistress,
        floodZoneRisks,
        weatherAdvisories,
    };
}

// ─── TELCO / SMS DASHBOARD ────────────────────────────────────────────────────

export async function getMessagingDashboardMetrics() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = subDays(now, 7);

    const [
        smsSentToday,
        smsDeliveredToday,
        smsFailedToday,
        pendingAlerts,
        recentBroadcasts,
        incomingReplies,
        deliveryByHour,
        weeklyVolume,
    ] = await Promise.all([
        // SMS sent today
        prisma.smsMessage.count({
            where: { direction: "OUTBOUND", createdAt: { gte: todayStart } },
        }),

        // Delivered today
        prisma.smsMessage.count({
            where: {
                direction: "OUTBOUND",
                status: "DELIVERED",
                createdAt: { gte: todayStart },
            },
        }),

        // Failed today
        prisma.smsMessage.count({
            where: {
                direction: "OUTBOUND",
                status: "FAILED",
                createdAt: { gte: todayStart },
            },
        }),

        // Messaging queue:
        // - PENDING_APPROVAL alerts still need admin action
        // - APPROVED alerts are ready for a disaster manager to trigger
        prisma.alert.findMany({
            where: { status: { in: ["PENDING_APPROVAL", "APPROVED"] } },
            take: 12,
            orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
            include: { location: true, organization: true },
        }),

        // Recent broadcasts (sent alerts)
        prisma.alert.findMany({
            where: { status: { in: ["SENT", "SENDING"] } },
            take: 8,
            orderBy: { sentAt: "desc" },
            include: { location: true },
        }),

        // Incoming citizen replies
        prisma.smsMessage.findMany({
            where: { direction: "INBOUND" },
            take: 15,
            orderBy: { createdAt: "desc" },
        }),

        // Delivery success rate by hour (last 24h)
        prisma.$queryRaw<{ hour: number; success: bigint; total: bigint }[]>`
      SELECT EXTRACT(HOUR FROM "createdAt") as hour,
             COUNT(*) FILTER (WHERE status = 'DELIVERED') as success,
             COUNT(*) as total
      FROM sms_messages
      WHERE direction = 'OUTBOUND'
        AND "createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY hour
    `,

        // Weekly SMS volume
        prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'Dy') as day,
             COUNT(*) as count
      FROM sms_messages
      WHERE direction = 'OUTBOUND'
        AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt")
    `,
    ]);

    const deliveryRate =
        smsSentToday > 0
            ? Math.round((smsDeliveredToday / smsSentToday) * 1000) / 10
            : 0;

    const pendingApprovalsCount = pendingAlerts.filter((alert) => alert.status === "PENDING_APPROVAL").length;
    const readyForBroadcastCount = pendingAlerts.filter((alert) => alert.status === "APPROVED").length;

    return {
        metrics: {
            smsSentToday,
            smsDeliveredToday,
            smsFailedToday,
            deliveryRate,
            pendingApprovalsCount,
            readyForBroadcastCount,
        },
        pendingAlerts,
        recentBroadcasts,
        incomingReplies,
        charts: {
            deliveryByHour: deliveryByHour.map((r) => ({
                hour: `${String(r.hour).padStart(2, "0")}:00`,
                success: Number(r.success),
                total: Number(r.total),
                rate:
                    Number(r.total) > 0
                        ? Math.round((Number(r.success) / Number(r.total)) * 100)
                        : 0,
            })),
            weeklyVolume: weeklyVolume.map((r) => ({
                time: r.day,
                count: Number(r.count),
            })),
        },
    };
}



