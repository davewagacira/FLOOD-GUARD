import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { subDays } from "date-fns";

const TELCO_HEALTH_SERVICES = ["sms_gateway", "database"];

export async function GET() {
    try {
        const since = subDays(new Date(), 7);

        const [healthChecks, smsStats, recentMessages, dailyVolume] = await Promise.all([
            prisma.systemHealthCheck.findMany({
                where: {
                    service: {
                        in: TELCO_HEALTH_SERVICES,
                    },
                },
                orderBy: { checkedAt: "desc" },
                distinct: ["service"],
                take: TELCO_HEALTH_SERVICES.length,
            }),
            prisma.smsMessage.groupBy({
                by: ["status"],
                where: { direction: "OUTBOUND" },
                _count: true,
            }),
            prisma.smsMessage.findMany({
                where: { direction: "OUTBOUND" },
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                    alert: {
                        include: {
                            location: { select: { name: true } },
                        },
                    },
                },
            }),
            prisma.$queryRaw<{ day: string; sent: bigint; delivered: bigint; failed: bigint }[]>`
                SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') as day,
                       COUNT(*) FILTER (WHERE direction = 'OUTBOUND') as sent,
                       COUNT(*) FILTER (WHERE direction = 'OUTBOUND' AND status = 'DELIVERED') as delivered,
                       COUNT(*) FILTER (WHERE direction = 'OUTBOUND' AND status = 'FAILED') as failed
                FROM sms_messages
                WHERE "createdAt" >= ${since}
                GROUP BY DATE_TRUNC('day', "createdAt")
                ORDER BY DATE_TRUNC('day', "createdAt")
            `,
        ]);

        return NextResponse.json({
            healthChecks,
            smsStats,
            recentMessages: recentMessages.map((message) => ({
                id: message.id,
                phoneNumber: message.phoneNumber,
                status: message.status,
                message: message.message,
                providerId: message.providerId,
                errorMsg: message.errorMsg,
                sentAt: message.sentAt,
                deliveredAt: message.deliveredAt,
                failedAt: message.failedAt,
                createdAt: message.createdAt,
                locationName: message.alert?.location?.name ?? "Unknown",
                alertTitle: message.alert?.title ?? null,
            })),
            dailyVolume: dailyVolume.map((entry) => ({
                day: entry.day,
                sent: Number(entry.sent),
                delivered: Number(entry.delivered),
                failed: Number(entry.failed),
            })),
        });
    } catch (err) {
        console.error("[API /sms/delivery-reports]", err);
        return NextResponse.json({ error: "Failed to fetch delivery reports" }, { status: 500 });
    }
}
