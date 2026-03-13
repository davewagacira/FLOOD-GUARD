import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    try {
        const recipients = await prisma.smsRecipient.findMany({
            include: {
                location: true,
                zone: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = recipients.map(r => ({
            id: r.id,
            phoneNumber: r.phoneNumber,
            locationName: r.location.name,
            zoneName: r.zone.name,
            zoneRisk: r.zone.riskLevel,
            createdAt: r.createdAt
        }));

        return NextResponse.json(formatted);
    } catch (err) {
        console.error("[API /dashboard/subscribers]", err);
        return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
    }
}
