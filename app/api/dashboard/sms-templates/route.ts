import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { SMS_TEMPLATE_CATALOG } from "@/lib/sms/template-catalog";

export async function GET() {
    try {
        const recipients = await prisma.smsRecipient.findMany({
            include: {
                location: { select: { name: true } },
                zone: { select: { name: true, riskLevel: true } },
            },
            orderBy: [{ zone: { name: "asc" } }, { phoneNumber: "asc" }],
        });

        return NextResponse.json({
            templates: SMS_TEMPLATE_CATALOG,
            recipients: recipients.map((recipient) => ({
                id: recipient.id,
                phoneNumber: recipient.phoneNumber,
                locationName: recipient.location.name,
                zoneName: recipient.zone.name,
                zoneRisk: recipient.zone.riskLevel,
            })),
        });
    } catch (err) {
        console.error("[API /dashboard/sms-templates]", err);
        return NextResponse.json({ error: "Failed to load SMS templates" }, { status: 500 });
    }
}
