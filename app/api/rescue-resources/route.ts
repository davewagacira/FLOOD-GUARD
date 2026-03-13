import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

type ResourceType = "BOAT" | "HELICOPTER" | "TRUCK" | "MEDICAL_TEAM" | "RESCUE_TEAM" | "SUPPLY_TRUCK";

const RESOURCE_TYPES = new Set<ResourceType>(["BOAT", "HELICOPTER", "TRUCK", "MEDICAL_TEAM", "RESCUE_TEAM", "SUPPLY_TRUCK"]);
const ACTIVE_DEPLOYMENT_STATUSES = ["DISPATCHED", "EN_ROUTE", "ON_SITE"] as const;

async function serializeResources() {
    const resources = await prisma.rescueResource.findMany({
        orderBy: { name: "asc" },
        include: {
            deployments: {
                where: { status: { in: [...ACTIVE_DEPLOYMENT_STATUSES] } },
                orderBy: { dispatchedAt: "desc" },
                take: 1,
                include: {
                    incident: { select: { id: true, title: true, status: true, severity: true } },
                },
            },
        },
    });

    const organizationIds = resources
        .map((resource) => resource.organizationId)
        .filter((value): value is string => Boolean(value));

    const organizations = organizationIds.length > 0
        ? await prisma.organization.findMany({
            where: { id: { in: organizationIds } },
            select: { id: true, name: true, type: true },
        })
        : [];

    const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));

    return resources.map((resource) => {
        const activeDeployment = resource.deployments[0] ?? null;
        return {
            ...resource,
            status: activeDeployment ? activeDeployment.status : resource.isAvailable ? "AVAILABLE" : "STANDBY",
            currentLocation: resource.latitude !== null && resource.longitude !== null
                ? `${resource.latitude.toFixed(5)}, ${resource.longitude.toFixed(5)}`
                : null,
            contactInfo: resource.contactPhone ?? null,
            organization: resource.organizationId ? organizationMap.get(resource.organizationId) ?? null : null,
            activeDeployment,
        };
    });
}

export async function GET(req: NextRequest) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    return NextResponse.json(await serializeResources());
}

export async function POST(req: NextRequest) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const name = String(body.name ?? "").trim();
        const type = String(body.type ?? "").toUpperCase() as ResourceType;
        const capacity = body.capacity !== undefined && body.capacity !== "" ? Number(body.capacity) : null;
        const latitude = body.latitude !== undefined && body.latitude !== "" ? Number(body.latitude) : null;
        const longitude = body.longitude !== undefined && body.longitude !== "" ? Number(body.longitude) : null;
        const contactPhone = body.contactPhone ? String(body.contactPhone).trim() : null;

        if (!name) {
            return NextResponse.json({ error: "Resource name is required." }, { status: 400 });
        }

        if (!RESOURCE_TYPES.has(type)) {
            return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
        }

        const resource = await prisma.rescueResource.create({
            data: {
                name,
                type,
                capacity: capacity !== null && Number.isFinite(capacity) ? Math.max(0, Math.round(capacity)) : null,
                latitude: latitude !== null && Number.isFinite(latitude) ? latitude : null,
                longitude: longitude !== null && Number.isFinite(longitude) ? longitude : null,
                contactPhone,
                organizationId: auth.user.organizationId,
                isAvailable: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: auth.user.id,
                action: "RESCUE_RESOURCE_CREATED",
                resource: "rescue_resource",
                resourceId: resource.id,
                metadata: { type: resource.type },
            },
        });

        return NextResponse.json(resource, { status: 201 });
    } catch (error) {
        console.error("[POST /api/rescue-resources]", error);
        return NextResponse.json({ error: "Failed to create rescue resource." }, { status: 500 });
    }
}
