import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const SESSION_COOKIE_NAME = "floodguard_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type ServerRole = "ADMIN" | "DISASTER_MANAGER" | "TELCO_OPERATOR";

interface SessionPayload {
    userId: string;
    email: string;
    role: ServerRole;
    exp: number;
}

function getSessionSecret() {
    return process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || process.env.SMS_PROVIDER_WEBHOOK_SECRET || "floodguard-dev-secret";
}

function base64urlEncode(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
    return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, email: string, role: ServerRole) {
    const payload: SessionPayload = {
        userId,
        email,
        role,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };

    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    const signature = sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
}

function parseSessionToken(token: string | undefined): SessionPayload | null {
    if (!token) return null;

    const [encodedPayload, encodedSignature] = token.split(".");
    if (!encodedPayload || !encodedSignature) return null;

    const expectedSignature = sign(encodedPayload);
    const valid =
        encodedSignature.length === expectedSignature.length &&
        timingSafeEqual(Buffer.from(encodedSignature), Buffer.from(expectedSignature));

    if (!valid) return null;

    try {
        const payload = JSON.parse(base64urlDecode(encodedPayload)) as SessionPayload;
        if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

export function clearSessionCookie(response: NextResponse) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
    });
}

export function attachSessionCookie(response: NextResponse, userId: string, email: string, role: ServerRole) {
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(userId, email, role), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    });
}

export async function getAuthenticatedUser(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = parseSessionToken(token);
    if (!session) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { organization: true },
    });

    if (!user || !user.isActive || user.email !== session.email || user.role !== session.role) {
        return null;
    }

    return user;
}

export async function requireUser(req: NextRequest) {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        return {
            user: null,
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    return { user, error: null };
}

export async function requireRole(req: NextRequest, roles: ServerRole[]) {
    const auth = await requireUser(req);
    if (auth.error || !auth.user) return auth;

    if (!roles.includes(auth.user.role as ServerRole)) {
        return {
            user: null,
            error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
    }

    return auth;
}

export { SESSION_COOKIE_NAME };
