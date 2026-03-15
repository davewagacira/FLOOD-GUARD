import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

async function getSettingsSnapshot(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            organization: true,
        },
    });

    if (!user) {
        return null;
    }

    const smsProvider =
        user.role === "DISASTER_MANAGER" || user.role === "TELCO_OPERATOR" || user.role === "ADMIN"
            ? await prisma.smsProviderConfig.findFirst({
                  orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
              })
            : null;

    const recentHealthChecks = await prisma.systemHealthCheck.findMany({
        where: {
            service: {
                in:
                    user.role === "DISASTER_MANAGER" || user.role === "TELCO_OPERATOR"
                        ? ["sms_gateway", "database"]
                        : ["database", "sms_gateway", "openweather_api", "tomorrow_io_api"],
            },
        },
        orderBy: { checkedAt: "desc" },
        distinct: ["service"],
        take: 6,
    });

    return {
        profile: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLoginAt: user.lastLoginAt,
            isActive: user.isActive,
        },
        organization: {
            id: user.organization.id,
            name: user.organization.name,
            type: user.organization.type,
            description: user.organization.description,
            contactEmail: user.organization.contactEmail,
            contactPhone: user.organization.contactPhone,
            logoUrl: user.organization.logoUrl,
            isActive: user.organization.isActive,
        },
        smsProvider: smsProvider
            ? {
                  id: smsProvider.id,
                  name: smsProvider.name,
                  baseUrl: smsProvider.baseUrl,
                  senderId: smsProvider.senderId,
                  isActive: smsProvider.isActive,
                  hasApiKey: Boolean(smsProvider.apiKey),
                  apiKeyPreview: smsProvider.apiKey ? `${smsProvider.apiKey.slice(0, 4)}****${smsProvider.apiKey.slice(-4)}` : "",
                  updatedAt: smsProvider.updatedAt,
              }
            : null,
        healthChecks: recentHealthChecks,
    };
}

export async function GET(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const snapshot = await getSettingsSnapshot(userId);

        if (!snapshot) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(snapshot);
    } catch (err) {
        console.error("[API /dashboard/settings GET]", err);
        return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = (await req.json()) as {
            userId?: string;
            profile?: { name?: string };
            organization?: {
                name?: string;
                description?: string | null;
                contactEmail?: string | null;
                contactPhone?: string | null;
                logoUrl?: string | null;
            };
            smsProvider?: {
                id?: string;
                name?: string;
                baseUrl?: string;
                senderId?: string;
                apiKey?: string;
                isActive?: boolean;
            };
        };

        if (!body.userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: body.userId },
            include: { organization: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (body.profile?.name?.trim()) {
            await prisma.user.update({
                where: { id: user.id },
                data: { name: body.profile.name.trim() },
            });
        }

        if (body.organization) {
            await prisma.organization.update({
                where: { id: user.organizationId },
                data: {
                    name: body.organization.name?.trim() || user.organization.name,
                    description: body.organization.description?.trim() || null,
                    contactEmail: body.organization.contactEmail?.trim() || null,
                    contactPhone: body.organization.contactPhone?.trim() || null,
                    logoUrl: body.organization.logoUrl?.trim() || null,
                },
            });
        }

        if (body.smsProvider && (user.role === "DISASTER_MANAGER" || user.role === "TELCO_OPERATOR" || user.role === "ADMIN")) {
            const currentProvider =
                (body.smsProvider.id &&
                    (await prisma.smsProviderConfig.findUnique({
                        where: { id: body.smsProvider.id },
                    }))) ||
                (await prisma.smsProviderConfig.findFirst({
                    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
                }));

            if (currentProvider) {
                await prisma.smsProviderConfig.update({
                    where: { id: currentProvider.id },
                    data: {
                        name: body.smsProvider.name?.trim() || currentProvider.name,
                        baseUrl: body.smsProvider.baseUrl?.trim() || currentProvider.baseUrl,
                        senderId: body.smsProvider.senderId?.trim() || currentProvider.senderId,
                        apiKey: body.smsProvider.apiKey?.trim() || currentProvider.apiKey,
                        isActive: typeof body.smsProvider.isActive === "boolean" ? body.smsProvider.isActive : currentProvider.isActive,
                    },
                });
            }
        }

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "UPDATE_SETTINGS",
                resource: "settings",
                resourceId: user.id,
            },
        });

        const snapshot = await getSettingsSnapshot(user.id);
        return NextResponse.json(snapshot);
    } catch (err) {
        console.error("[API /dashboard/settings PATCH]", err);
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
}
