import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

const ALLOWED_STATUSES = new Set(["RECEIVED", "ACKNOWLEDGED", "ASSIGNED", "RESOLVED"]);
const SIGNAL_INCIDENT_TITLES: Record<string, string> = {
    NEED_HELP: "Citizen Distress Incident",
    SAFE: "Citizen Safety Confirmation",
    FREE_TEXT: "Citizen SMS Escalation",
};

async function getSignal(id: string) {
    return prisma.distressSignal.findUnique({
        where: { id },
        include: {
            location: { select: { id: true, name: true, county: true, latitude: true, longitude: true } },
            incident: { select: { id: true, title: true, status: true, severity: true } },
        },
    });
}

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    try {
        const params = await props.params;
        const body = await req.json();
        const signal = await prisma.distressSignal.findUnique({ where: { id: params.id } });

        if (!signal) {
            return NextResponse.json({ error: "Distress signal not found." }, { status: 404 });
        }

        const nextStatus = body.status !== undefined ? String(body.status).toUpperCase() : undefined;
        const note = body.note !== undefined ? String(body.note).trim() : "";
        let incidentId = body.incidentId !== undefined ? (body.incidentId ? String(body.incidentId) : null) : signal.incidentId;

        if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) {
            return NextResponse.json({ error: "Invalid distress signal status." }, { status: 400 });
        }

        if (body.createIncident) {
            const incident = await prisma.incident.create({
                data: {
                    title: `${SIGNAL_INCIDENT_TITLES[signal.signalType] ?? "Citizen Distress Incident"} - ${signal.phoneNumber}`,
                    description: note || signal.rawMessage,
                    severity: signal.signalType === "NEED_HELP" ? "HIGH" : "MEDIUM",
                    status: "OPEN",
                    organizationId: auth.user.organizationId,
                    locationId: signal.locationId,
                    latitude: signal.latitude ?? signal.locationId ? undefined : null,
                    longitude: signal.longitude ?? signal.locationId ? undefined : null,
                    updates: {
                        create: {
                            message: `Incident created from distress signal ${signal.phoneNumber}. ${note}`.trim(),
                            updatedBy: auth.user.name,
                        },
                    },
                },
                select: { id: true },
            });
            incidentId = incident.id;
        }

        const updated = await prisma.distressSignal.update({
            where: { id: params.id },
            data: {
                ...(nextStatus && { status: nextStatus as "RECEIVED" | "ACKNOWLEDGED" | "ASSIGNED" | "RESOLVED" }),
                ...(incidentId !== undefined && { incidentId }),
                ...(nextStatus === "RESOLVED" && { resolvedAt: new Date() }),
            },
        });

        if (note) {
            await prisma.auditLog.create({
                data: {
                    userId: auth.user.id,
                    action: "DISTRESS_SIGNAL_UPDATED",
                    resource: "distress_signal",
                    resourceId: updated.id,
                    metadata: { status: nextStatus ?? updated.status, note, incidentId },
                },
            });
        }

        const fullSignal = await getSignal(updated.id);
        return NextResponse.json(fullSignal);
    } catch (error) {
        console.error("[PATCH /api/distress-signals/[id]]", error);
        return NextResponse.json({ error: "Failed to update distress signal." }, { status: 500 });
    }
}
