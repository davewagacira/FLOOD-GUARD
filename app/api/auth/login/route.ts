// POST /api/auth/login
// Authenticates users against the Neon database
// Replaces the old mock authentication system

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { attachSessionCookie } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Look up user in the real database
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { organization: { select: { name: true, type: true, logoUrl: true } } },
        });

        if (!user || !user.isActive) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Verify password with bcrypt
        const passwordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordValid) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Update last login timestamp
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Log the login event
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "LOGIN",
                resource: "auth",
                resourceId: user.id,
            },
        });

        // Map DB role to UI role
        const roleMap: Record<string, "admin" | "ngo" | "telco"> = {
            ADMIN: "admin",
            DISASTER_MANAGER: "ngo",
            TELCO_OPERATOR: "telco",
        };

        const uiRole = roleMap[user.role] ?? "ngo";

        const sessionUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: uiRole,
            organizationId: user.organizationId,
            organizationName: user.organization.name,
            organizationLogoUrl: user.organization.logoUrl || null,
        };

        const response = NextResponse.json({ user: sessionUser });
        attachSessionCookie(response, user.id, user.email, user.role);
        return response;
    } catch (err) {
        console.error("[Auth Login] Error:", err);
        return NextResponse.json(
            { error: "Authentication failed" },
            { status: 500 }
        );
    }
}
