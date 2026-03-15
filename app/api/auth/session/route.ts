import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error || !auth.user) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const roleMap: Record<string, "admin" | "ngo"> = {
        ADMIN: "admin",
        DISASTER_MANAGER: "ngo",
        TELCO_OPERATOR: "ngo",
    };

    return NextResponse.json({
        user: {
            id: auth.user.id,
            email: auth.user.email,
            name: auth.user.name,
            role: roleMap[auth.user.role] ?? "ngo",
            organizationId: auth.user.organizationId,
            organizationName: auth.user.organization?.name,
            organizationLogoUrl: auth.user.organization?.logoUrl ?? null,
        },
    });
}
