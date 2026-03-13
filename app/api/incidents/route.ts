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

export async function GET(req: NextRequest) {
    const auth = await requireRole(req, [...ALLOWED_ROLES]);
    if (auth.error) return auth.error;

    const incidents = await prisma.incident.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            _count: { select: { distressSignals: true, deployments: true } },
            updates: {
                take: 1,
                orderBy: { createdAt: "desc" },
                select: { id: true, message: true, updatedBy: true, createdAt: true },
            },
            organization: { select: { id: true, name: true, type: true } },
        },
    });

    const locationIds = incidents
        .map((incident) => incident.locationId)
        .filter((value): value is string => Boolean(value));

    const locations = locationIds.length > 0
        ? await prisma.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true, county: true },
        })
        : [];

    const locationMap = new Map(locations.map((location) => [location.id, location]));

    return NextResponse.json(
        incidents.map((incident) => ({
            ...incident,
            locationName: incident.locationId ? locationMap.get(incident.locationId)?.name ?? null : null,
            county: incident.locationId ? locationMap.get(incident.locationId)?.county ?? null : null,
            latestUpdate: incident.updates[0] ?? null,
        })),
    );
}

export async function POST(req: NextRequest) {
    const auth = await requireRole(req, [...ALLOWED_ROLES]);
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const title = String(body.title ?? "").trim();
        const description = String(body.description ?? "").trim();
        const severity = String(body.severity ?? "MEDIUM").toUpperCase();
        const status = String(body.status ?? "OPEN").toUpperCase();
        const initialUpdate = String(body.initialUpdate ?? "").trim();
        const locationId = body.locationId ? String(body.locationId) : null;
        const affectedCount = parseNumber(body.affectedCount);
        const latitude = parseNumber(body.latitude);
        const longitude = parseNumber(body.longitude);

        if (!title) {
            return NextResponse.json({ error: "Incident title is required." }, { status: 400 });
        }

        if (!SEVERITIES.has(severity)) {
            return NextResponse.json({ error: "Invalid incident severity." }, { status: 400 });
        }

        if (!STATUSES.has(status)) {
            return NextResponse.json({ error: "Invalid incident status." }, { status: 400 });
        }

        if (locationId) {
            const location = await prisma.location.findUnique({ where: { id: locationId }, select: { id: true } });
            if (!location) {
                return NextResponse.json({ error: "Selected location does not exist." }, { status: 400 });
            }
        }

        const incident = await prisma.incident.create({
            data: {
                title,
                description: description || null,
                severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                status: status as "OPEN" | "IN_PROGRESS" | "MONITORING" | "RESOLVED" | "CLOSED",
                affectedCount: affectedCount !== null ? Math.max(0, Math.round(affectedCount)) : null,
                latitude,
                longitude,
                locationId,
                organizationId: auth.user.organizationId,
                resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
                updates: initialUpdate
                    ? {
                        create: {
                            message: initialUpdate,
                            updatedBy: auth.user.name,
                        },
                    }
                    : undefined,
            },
            include: {
                _count: { select: { distressSignals: true, deployments: true } },
                updates: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    select: { id: true, message: true, updatedBy: true, createdAt: true },
                },
                organization: { select: { id: true, name: true, type: true } },
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: auth.user.id,
                action: "INCIDENT_CREATED",
                resource: "incident",
                resourceId: incident.id,
                metadata: { severity, status },
            },
        });

        return NextResponse.json(incident, { status: 201 });
    } catch (error) {
        console.error("[POST /api/incidents]", error);
        return NextResponse.json({ error: "Failed to create incident." }, { status: 500 });
    }
}
