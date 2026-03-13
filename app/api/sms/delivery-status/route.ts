// POST /api/sms/delivery-status
// Webhook for textsms.co.ke delivery status callbacks

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
    let body: Record<string, string> = {};

    try {
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            body = await req.json();
        } else {
            const text = await req.text();
            for (const pair of text.split("&")) {
                const [k, v] = pair.split("=");
                if (k && v) body[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
            }
        }
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Log raw webhook
    await prisma.webhookLog.create({
        data: {
            source: "textsms.co.ke",
            endpoint: "/api/sms/delivery-status",
            payload: body,
        },
    });

    const messageId = body.messageId || body.message_id || body.id;
    const status = body.status?.toUpperCase();
    const phone = body.mobile || body.recipient;

    if (!messageId && !phone) {
        return NextResponse.json({ received: true });
    }

    // Map provider status to our SmsStatus enum
    const smsStatus = (() => {
        switch (status) {
            case "DELIVERED":
            case "DeliveredToTerminal":
                return "DELIVERED";
            case "FAILED":
            case "DeliveryFailed":
            case "UNDELIVERED":
                return "FAILED";
            case "SENT":
            case "MessageWaiting":
                return "SENT";
            default:
                return "SENT";
        }
    })();

    try {
        if (phone) {
            // Update most recent outbound message to this number
            const msg = await prisma.smsMessage.findFirst({
                where: { phoneNumber: phone, direction: "OUTBOUND" },
                orderBy: { createdAt: "desc" },
            });

            if (msg) {
                await prisma.smsMessage.update({
                    where: { id: msg.id },
                    data: {
                        status: smsStatus as "DELIVERED" | "FAILED" | "SENT",
                        deliveredAt: smsStatus === "DELIVERED" ? new Date() : undefined,
                        failedAt: smsStatus === "FAILED" ? new Date() : undefined,
                    },
                });
            }
        }

        return NextResponse.json({ received: true, status: smsStatus });
    } catch (err) {
        console.error("[SMS DeliveryStatus] DB error:", err);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
}
