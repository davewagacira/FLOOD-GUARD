import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    try {
        const params = await props.params;
        const body = await req.json();
        const incidentId = String(body.incidentId ?? "");

        if (!incidentId) {
            return NextResponse.json({ error: "Incident is required for deployment." }, { status: 400 });
        }

        const [resource, incident] = await Promise.all([
            prisma.rescueResource.findUnique({
                where: { id: params.id },
                include: {
                    deployments: {
                        where: { status: { in: ["DISPATCHED", "EN_ROUTE", "ON_SITE"] } },
                        take: 1,
                    },
                },
            }),
            prisma.incident.findUnique({ where: { id: incidentId } }),
        ]);

        if (!resource) {
            return NextResponse.json({ error: "Rescue resource not found." }, { status: 404 });
        }

        if (!incident) {
            return NextResponse.json({ error: "Incident not found." }, { status: 404 });
        }

        const action = String(body.action ?? "dispatch").toLowerCase();
        if (action === "dispatch") {
            if (resource.deployments.length > 0) {
                return NextResponse.json({ error: "Resource already has an active deployment." }, { status: 409 });
            }

            const deployment = await prisma.$transaction(async (tx) => {
                const created = await tx.deployment.create({
                    data: {
                        incidentId,
                        resourceId: params.id,
                        status: "DISPATCHED",
                        latitude: body.latitude !== undefined && body.latitude !== null && body.latitude !== "" ? Number(body.latitude) : resource.latitude,
                        longitude: body.longitude !== undefined && body.longitude !== null && body.longitude !== "" ? Number(body.longitude) : resource.longitude,
                    },
                });

                await tx.rescueResource.update({
                    where: { id: params.id },
                    data: { isAvailable: false },
                });

                await tx.auditLog.create({
                    data: {
                        userId: auth.user.id,
                        action: "RESCUE_RESOURCE_DEPLOYED",
                        resource: "deployment",
                        resourceId: created.id,
                        metadata: { incidentId, resourceId: params.id },
                    },
                });

                return created;
            });

            return NextResponse.json(deployment, { status: 201 });
        }

        const activeDeployment = await prisma.deployment.findFirst({
            where: {
                resourceId: params.id,
                status: { in: ["DISPATCHED", "EN_ROUTE", "ON_SITE"] },
            },
            orderBy: { dispatchedAt: "desc" },
        });

        if (!activeDeployment) {
            return NextResponse.json({ error: "No active deployment found for this resource." }, { status: 404 });
        }

        const nextStatus = action === "complete" ? "COMPLETED" : action === "recall" ? "RECALLED" : "";
        if (!nextStatus) {
            return NextResponse.json({ error: "Invalid deployment action." }, { status: 400 });
        }

        const deployment = await prisma.$transaction(async (tx) => {
            const updated = await tx.deployment.update({
                where: { id: activeDeployment.id },
                data: {
                    status: nextStatus,
                    ...(nextStatus === "COMPLETED" && { completedAt: new Date() }),
                },
            });

            await tx.rescueResource.update({
                where: { id: params.id },
                data: { isAvailable: true },
            });

            await tx.auditLog.create({
                data: {
                    userId: auth.user.id,
                    action: "RESCUE_RESOURCE_RELEASED",
                    resource: "deployment",
                    resourceId: updated.id,
                    metadata: { incidentId: updated.incidentId, resourceId: params.id, action: nextStatus },
                },
            });

            return updated;
        });

        return NextResponse.json(deployment);
    } catch (error) {
        console.error("[POST /api/rescue-resources/[id]/deploy]", error);
        return NextResponse.json({ error: "Failed to process deployment action." }, { status: 500 });
    }
}
