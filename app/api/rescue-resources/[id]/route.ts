import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/server-auth";

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    const auth = await requireRole(req, ["ADMIN", "DISASTER_MANAGER"]);
    if (auth.error) return auth.error;

    try {
        const params = await props.params;
        const body = await req.json();

        const resource = await prisma.rescueResource.findUnique({ where: { id: params.id } });
        if (!resource) {
            return NextResponse.json({ error: "Rescue resource not found." }, { status: 404 });
        }

        const updated = await prisma.rescueResource.update({
            where: { id: params.id },
            data: {
                ...(body.name !== undefined && { name: String(body.name).trim() }),
                ...(body.capacity !== undefined && { capacity: body.capacity === "" || body.capacity === null ? null : Math.max(0, Math.round(Number(body.capacity))) }),
                ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone ? String(body.contactPhone).trim() : null }),
                ...(body.latitude !== undefined && { latitude: body.latitude === "" || body.latitude === null ? null : Number(body.latitude) }),
                ...(body.longitude !== undefined && { longitude: body.longitude === "" || body.longitude === null ? null : Number(body.longitude) }),
                ...(body.isAvailable !== undefined && { isAvailable: Boolean(body.isAvailable) }),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: auth.user.id,
                action: "RESCUE_RESOURCE_UPDATED",
                resource: "rescue_resource",
                resourceId: updated.id,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[PATCH /api/rescue-resources/[id]]", error);
        return NextResponse.json({ error: "Failed to update rescue resource." }, { status: 500 });
    }
}
