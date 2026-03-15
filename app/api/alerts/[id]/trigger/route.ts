// POST /api/alerts/[id]/trigger
// Admin or disaster manager manually triggers the SMS broadcast

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { normalizePhone, sendBulkSms } from "@/lib/sms/sms-provider";

export async function POST(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    try {
        const params = await props.params;
        const alert = await prisma.alert.findUnique({
            where: { id: params.id },
            include: { location: true },
        });

        if (!alert) {
            return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        if (alert.status !== "PENDING_APPROVAL" && alert.status !== "APPROVED") {
            return NextResponse.json({ error: "Alert is not pending or approved" }, { status: 400 });
        }

        const zoneIds: string[] = [];

        if (alert.locationId) {
            const zones = await prisma.floodZone.findMany({ where: { locationId: alert.locationId } });
            zoneIds.push(...zones.map((zone) => zone.id));
        } else {
            const zones = await prisma.floodZone.findMany({ where: { isActive: true } });
            zoneIds.push(...zones.map((zone) => zone.id));
        }

        const recipients = await prisma.smsRecipient.findMany({
            where: { zoneId: { in: zoneIds } },
        });

        if (recipients.length === 0) {
            await prisma.alert.update({
                where: { id: alert.id },
                data: { status: "SENT", sentAt: new Date(), recipientCount: 0 },
            });

            return NextResponse.json({ message: "No recipients found for this zone", count: 0 });
        }

        const phoneNumbers = [...new Set(recipients.map((recipient) => normalizePhone(recipient.phoneNumber)))];

        await prisma.alert.update({
            where: { id: alert.id },
            data: { status: "SENDING", recipientCount: phoneNumbers.length },
        });

        const smsResult = await sendBulkSms(phoneNumbers, alert.message);
        const now = new Date();

        await prisma.smsMessage.createMany({
            data: smsResult.results.map((result) => ({
                alertId: alert.id,
                phoneNumber: result.recipient ?? "",
                message: alert.message,
                direction: "OUTBOUND",
                status: result.success ? "SENT" : "FAILED",
                providerId: result.messageId || null,
                errorMsg: result.success ? null : result.error ?? null,
                sentAt: result.success ? now : null,
                failedAt: result.success ? null : now,
                metadata: result.raw ?? undefined,
            })),
        });

        await prisma.alert.update({
            where: { id: alert.id },
            data: {
                status: smsResult.sent > 0 ? "SENT" : "CANCELLED",
                sentAt: smsResult.sent > 0 ? now : null,
                recipientCount: smsResult.sent,
            },
        });

        return NextResponse.json({
            success: smsResult.sent > 0,
            sent: smsResult.sent,
            failed: smsResult.failed,
            recipients: smsResult.results.map((result) => ({
                phoneNumber: result.recipient,
                status: result.success ? "SENT" : "FAILED",
                error: result.error ?? null,
            })),
        });
    } catch (err) {
        console.error("[API /alerts/trigger]", err);
        return NextResponse.json({ error: "Failed to trigger broadcast" }, { status: 500 });
    }
}

