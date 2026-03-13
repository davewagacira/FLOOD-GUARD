import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { normalizePhone, sendBulkSms } from "@/lib/sms/sms-provider";

export async function POST(req: NextRequest) {
    try {
        const { message, title } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const recipients = await prisma.smsRecipient.findMany({
            orderBy: { createdAt: "asc" },
        });

        if (recipients.length === 0) {
            return NextResponse.json({ message: "No subscribers found to send SMS to." }, { status: 404 });
        }

        const phoneNumbers = [...new Set(recipients.map((recipient) => normalizePhone(recipient.phoneNumber)))];

        const telcoOrg = await prisma.organization.findFirst({ where: { type: "TELCO" } });

        if (!telcoOrg) {
            return NextResponse.json({ error: "Telco Organization not found in DB." }, { status: 500 });
        }

        const alert = await prisma.alert.create({
            data: {
                title: title || "Manual Template Broadcast",
                message,
                riskLevel: "MEDIUM",
                status: "SENDING",
                organizationId: telcoOrg.id,
                recipientCount: phoneNumbers.length,
            },
        });

        const smsResult = await sendBulkSms(phoneNumbers, message);
        const now = new Date();

        await prisma.smsMessage.createMany({
            data: smsResult.results.map((result) => ({
                alertId: alert.id,
                phoneNumber: result.recipient ?? "",
                message,
                direction: "OUTBOUND",
                status: result.success ? "SENT" : "FAILED",
                providerId: result.messageId || null,
                sentAt: result.success ? now : null,
                failedAt: result.success ? null : now,
                errorMsg: result.success ? null : result.error ?? null,
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

        if (smsResult.sent === 0) {
            return NextResponse.json(
                {
                    error: "The SMS provider did not accept any of the demo messages.",
                    sent: 0,
                    failed: smsResult.failed,
                    totalSubscribers: phoneNumbers.length,
                    failedRecipients: smsResult.results
                        .filter((result) => !result.success)
                        .map((result) => ({
                            phoneNumber: result.recipient,
                            error: result.error ?? "Unknown error",
                        })),
                },
                { status: 502 },
            );
        }

        return NextResponse.json({
            success: true,
            sent: smsResult.sent,
            failed: smsResult.failed,
            totalSubscribers: phoneNumbers.length,
            recipients: smsResult.results.map((result) => ({
                phoneNumber: result.recipient,
                status: result.success ? "SENT" : "FAILED",
                messageId: result.messageId ?? null,
                error: result.error ?? null,
            })),
        });
    } catch (err) {
        console.error("[API /sms-templates/send]", err);
        return NextResponse.json({ error: "Failed to broadcast template" }, { status: 500 });
    }
}
