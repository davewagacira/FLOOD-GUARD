// PATCH /api/alerts/[id]/status
// Used to approve, cancel, or schedule SMS alerts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type MutableAlertStatus = "APPROVED" | "CANCELLED" | "PENDING_APPROVAL";

const ALLOWED_STATUSES = new Set<MutableAlertStatus>(["APPROVED", "CANCELLED", "PENDING_APPROVAL"]);

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    try {
        const params = await props.params;
        const { status, scheduledAt } = await req.json() as { status?: MutableAlertStatus; scheduledAt?: string };

        if (!status || !ALLOWED_STATUSES.has(status)) {
            return NextResponse.json({ error: "Unsupported alert status" }, { status: 400 });
        }

        const alert = await prisma.alert.findUnique({ where: { id: params.id } });
        if (!alert) {
            return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }

        if (["SENDING", "SENT", "EXPIRED"].includes(alert.status)) {
            return NextResponse.json({ error: "Cannot change status of this alert" }, { status: 400 });
        }

        const updated = await prisma.alert.update({
            where: { id: alert.id },
            data: {
                status,
                approvedAt: status === "APPROVED" ? new Date() : status === "PENDING_APPROVAL" ? null : alert.approvedAt,
                sentAt: status === "CANCELLED" ? null : alert.sentAt,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : alert.scheduledAt,
            },
        });

        return NextResponse.json({
            success: true,
            status: updated.status,
            approvedAt: updated.approvedAt,
            scheduledAt: updated.scheduledAt,
        });
    } catch (err) {
        console.error("[API /alerts/status]", err);
        return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
    }
}
