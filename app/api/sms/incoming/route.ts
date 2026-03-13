// POST /api/sms/incoming
// Webhook endpoint for textsms.co.ke incoming citizen SMS responses
// Citizens reply 1 (NEED_HELP) or 2 (SAFE)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseIncomingSms, normalizePhone } from "@/lib/sms/sms-provider";

export async function POST(req: NextRequest) {
    let body: Record<string, string> = {};

    try {
        // textsms.co.ke may send form-encoded or JSON
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            body = await req.json();
        } else {
            const text = await req.text();
            // Parse form-encoded
            for (const pair of text.split("&")) {
                const [k, v] = pair.split("=");
                if (k && v) body[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
            }
        }
    } catch (err) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Log raw webhook
    await prisma.webhookLog.create({
        data: {
            source: "textsms.co.ke",
            endpoint: "/api/sms/incoming",
            payload: body,
        },
    });

    const rawPhone = body.mobile || body.from || body.sender || "";
    const rawMessage = body.message || body.text || body.msg || "";

    if (!rawPhone || !rawMessage) {
        return NextResponse.json({ error: "Missing phone or message" }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);
    const signalType = parseIncomingSms(rawMessage);

    try {
        // Store incoming SMS
        await prisma.smsMessage.create({
            data: {
                phoneNumber: phone,
                message: rawMessage,
                direction: "INBOUND",
                status: "DELIVERED",
                sentAt: new Date(),
                deliveredAt: new Date(),
            },
        });

        // Create distress signal record
        await prisma.distressSignal.create({
            data: {
                phoneNumber: phone,
                rawMessage,
                signalType,
                status: signalType === "NEED_HELP" ? "RECEIVED" : "ACKNOWLEDGED",
            },
        });

        console.log(`[SMS Incoming] ${phone} → ${signalType}: "${rawMessage}"`);

        return NextResponse.json({ success: true, signalType });
    } catch (err) {
        console.error("[SMS Incoming] DB error:", err);
        return NextResponse.json({ error: "Failed to process" }, { status: 500 });
    }
}
