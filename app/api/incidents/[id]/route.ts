import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

const ALLOWED_ROLES = ["ADMIN", "DISASTER_MANAGER"] as const;
const SEVERITIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const STATUSES = new Set(["OPEN", "IN_PROGRESS", "MONITORING", "RESOLVED", "CLOSED"]);

function parseNumber(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

async function getIncidentPayload(id: string) {
    const incident = await prisma.incident.findUnique({
        where: { id },
        include: {
            _count: { select: { distressSignals: true, deployments: true } },
            updates: {
                orderBy: { createdAt: "desc" },
                select: { id: true, message: true, updatedBy: true, createdAt: true },
            },
            deployments: {
                orderBy: { dispatchedAt: "desc" },
                include: {
                    resource: { select: { id: true, name: true, type: true, contactPhone: true, isAvailable: true } },
                },
            },
            distressSignals: {
                take: 10,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    phoneNumber: true,
                    signalType: true,
                    status: true,
                    rawMessage: true,
                    createdAt: true,
                },
            },
            organization: { select: { id: true, name: true, type: true } },
        },
    });

    if (!incident) return null;

    const location = incident.locationId
        ? await prisma.location.findUnique({
            where: { id: incident.locationId },
            select: { id: true, name: true, county: true, latitude: true, longitude: true },
        })
        : null;

    return {
        ...incident,
        location,
    };
}

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    const auth = await requireRole(req, [...ALLOWED_ROLES]);
    if (auth.error) return auth.error;

    const params = await props.params;
    const incident = await getIncidentPayload(params.id);
    if (!incident) {
        return NextResponse.json({ error: "Incident not found." }, { status: 404 });
    }

    return NextResponse.json(incident);
}

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    const auth = await requireRole(req, [...ALLOWED_ROLES]);
    if (auth.error) return auth.error;

    try {
        const params = await props.params;
        const body = await req.json();

        const existing = await prisma.incident.findUnique({
            where: { id: params.id },
            select: { id: true, status: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Incident not found." }, { status: 404 });
        }

        const title = body.title !== undefined ? String(body.title).trim() : undefined;
        const description = body.description !== undefined ? String(body.description).trim() : undefined;
        const severity = body.severity !== undefined ? String(body.severity).toUpperCase() : undefined;
        const status = body.status !== undefined ? String(body.status).toUpperCase() : undefined;
        const updateMessage = body.updateMessage !== undefined ? String(body.updateMessage).trim() : undefined;
        const affectedCount = body.affectedCount !== undefined ? parseNumber(body.affectedCount) : undefined;
        const latitude = body.latitude !== undefined ? parseNumber(body.latitude) : undefined;
        const longitude = body.longitude !== undefined ? parseNumber(body.longitude) : undefined;

        if (title !== undefined && !title) {
            return NextResponse.json({ error: "Incident title cannot be empty." }, { status: 400 });
        }

        if (severity !== undefined && !SEVERITIES.has(severity)) {
            return NextResponse.json({ error: "Invalid incident severity." }, { status: 400 });
        }

        if (status !== undefined && !STATUSES.has(status)) {
            return NextResponse.json({ error: "Invalid incident status." }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.incident.update({
                where: { id: params.id },
                data: {
                    ...(title !== undefined && { title }),
                    ...(description !== undefined && { description: description || null }),
                    ...(severity !== undefined && { severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }),
                    ...(status !== undefined && { status: status as "OPEN" | "IN_PROGRESS" | "MONITORING" | "RESOLVED" | "CLOSED" }),
                    ...(affectedCount !== undefined && { affectedCount: affectedCount !== null ? Math.max(0, Math.round(affectedCount)) : null }),
                    ...(latitude !== undefined && { latitude }),
                    ...(longitude !== undefined && { longitude }),
                    ...(status !== undefined && {
                        resolvedAt: status === "RESOLVED" || status === "CLOSED"
                            ? new Date()
                            : existing.status === "RESOLVED" || existing.status === "CLOSED"
                                ? null
                                : undefined,
                    }),
                },
            });

            if (updateMessage) {
                await tx.incidentUpdate.create({
                    data: {
                        incidentId: params.id,
                        message: updateMessage,
                        updatedBy: auth.user.name,
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: auth.user.id,
                    action: "INCIDENT_UPDATED",
                    resource: "incident",
                    resourceId: params.id,
                    metadata: {
                        status: status ?? existing.status,
                        severity: severity ?? undefined,
                        noteAdded: Boolean(updateMessage),
                    },
                },
            });
        });

        const incident = await getIncidentPayload(params.id);
        return NextResponse.json(incident);
    } catch (error) {
        console.error("[PATCH /api/incidents/[id]]", error);
        return NextResponse.json({ error: "Failed to update incident." }, { status: 500 });
    }
}
