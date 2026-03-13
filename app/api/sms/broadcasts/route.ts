// GET /api/sms/broadcasts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { subDays } from "date-fns";

export async function GET() {
    try {
        const since = subDays(new Date(), 7);

        const [sent, scheduled, recentMessages] = await Promise.all([
            prisma.alert.findMany({
                where: { status: { in: ["SENT", "SENDING"] } },
                orderBy: { sentAt: "desc" },
                take: 20,
                include: {
                    location: { select: { name: true, county: true } },
                    organization: { select: { name: true } },
                },
            }),
            prisma.alert.findMany({
                where: { status: { in: ["APPROVED", "PENDING_APPROVAL"] } },
                orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
                take: 10,
                include: {
                    location: { select: { name: true, county: true } },
                    organization: { select: { name: true } },
                },
            }),
            prisma.smsMessage.findMany({
                where: {
                    direction: "OUTBOUND",
                    createdAt: { gte: since },
                },
                orderBy: { createdAt: "desc" },
                take: 200,
                include: {
                    alert: {
                        include: {
                            location: { select: { name: true } },
                        },
                    },
                },
            }),
        ]);

        const zoneMap = new Map<string, { region: string; sent: number; delivered: number; failed: number }>();

        for (const message of recentMessages) {
            const region = message.alert?.location?.name ?? "Unknown";
            const current = zoneMap.get(region) ?? { region, sent: 0, delivered: 0, failed: 0 };
            current.sent += 1;
            if (message.status === "DELIVERED") current.delivered += 1;
            if (message.status === "FAILED") current.failed += 1;
            zoneMap.set(region, current);
        }

        return NextResponse.json({
            sent,
            scheduled,
            deliveryByZone: Array.from(zoneMap.values())
                .sort((a, b) => b.sent - a.sent)
                .map((entry) => ({
                    ...entry,
                    rate: entry.sent > 0 ? Math.round((entry.delivered / entry.sent) * 1000) / 10 : 0,
                })),
        });
    } catch (err) {
        console.error("[API /sms/broadcasts]", err);
        return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
    }
}
