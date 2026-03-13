import { config as loadEnv } from "dotenv";
import { NextRequest } from "next/server";

loadEnv({ path: ".env.local" });
loadEnv();

type TestResult = {
    name: string;
    ok: boolean;
    status: number;
    details: string;
};

const SESSION_COOKIE_NAME = "floodguard_session";

function makeRequest(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
    const headers = new Headers();
    if (options.token) {
        headers.set("cookie", `${SESSION_COOKIE_NAME}=${options.token}`);
    }
    if (options.body !== undefined) {
        headers.set("content-type", "application/json");
    }

    return new NextRequest(`http://localhost:3000${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
}

async function parseResponse(response: Response) {
    let payload: unknown = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    return { status: response.status, payload };
}

async function run() {
    const [{ prisma }, authModule, incidentsModule, incidentItemModule] = await Promise.all([
        import("@/lib/db/prisma"),
        import("@/lib/server-auth"),
        import("@/app/api/incidents/route"),
        import("@/app/api/incidents/[id]/route"),
    ]);

    const { createSessionToken } = authModule;
    const { GET: listIncidents, POST: createIncident } = incidentsModule;
    const { GET: getIncident, PATCH: updateIncident } = incidentItemModule;

    const users = await prisma.user.findMany({
        where: { isActive: true, role: { in: ["ADMIN", "TELCO_OPERATOR"] } },
        select: { id: true, email: true, role: true },
    });

    const admin = users.find((user) => user.role === "ADMIN");
    const telco = users.find((user) => user.role === "TELCO_OPERATOR");

    if (!admin || !telco) {
        throw new Error("Admin or telco user missing for incident API verification.");
    }

    const adminToken = createSessionToken(admin.id, admin.email, admin.role);
    const telcoToken = createSessionToken(telco.id, telco.email, telco.role);
    const createdIds: string[] = [];
    const results: TestResult[] = [];

    try {
        {
            const response = await listIncidents(makeRequest("/api/incidents"));
            const { status } = await parseResponse(response);
            results.push({
                name: "GET /api/incidents requires auth",
                ok: status === 401,
                status,
                details: "Unauthenticated incident list requests should be rejected.",
            });
        }

        {
            const response = await listIncidents(makeRequest("/api/incidents", { token: telcoToken }));
            const { status } = await parseResponse(response);
            results.push({
                name: "GET /api/incidents blocks telco access",
                ok: status === 403,
                status,
                details: "Telco users should not access the admin incident workflow.",
            });
        }

        {
            const response = await listIncidents(makeRequest("/api/incidents", { token: adminToken }));
            const { status, payload } = await parseResponse(response);
            const incidents = Array.isArray(payload) ? payload : [];
            results.push({
                name: "GET /api/incidents returns admin incident list",
                ok: status === 200 && Array.isArray(incidents),
                status,
                details: `Returned ${incidents.length} incidents for admin access.`,
            });
        }

        let incidentId = "";

        {
            const response = await createIncident(makeRequest("/api/incidents", {
                method: "POST",
                token: adminToken,
                body: {
                    title: "Incident API Verification",
                    description: "Created automatically during admin incident API verification.",
                    severity: "HIGH",
                    status: "OPEN",
                    affectedCount: 12,
                    latitude: -1.286389,
                    longitude: 36.817223,
                    initialUpdate: "Verification incident created.",
                },
            }));
            const { status, payload } = await parseResponse(response);
            const created = payload as { id?: string } | null;
            incidentId = created?.id ?? "";
            if (incidentId) createdIds.push(incidentId);

            results.push({
                name: "POST /api/incidents creates a live incident",
                ok: status === 201 && Boolean(incidentId),
                status,
                details: incidentId ? `Created incident ${incidentId}.` : "Incident creation did not return an id.",
            });
        }

        {
            const response = await getIncident(
                makeRequest(`/api/incidents/${incidentId}`, { token: adminToken }),
                { params: Promise.resolve({ id: incidentId }) },
            );
            const { status, payload } = await parseResponse(response);
            const detail = payload as { updates?: unknown[]; distressSignals?: unknown[] } | null;
            results.push({
                name: "GET /api/incidents/[id] returns incident detail",
                ok: status === 200 && Array.isArray(detail?.updates) && Array.isArray(detail?.distressSignals),
                status,
                details: "Incident detail includes timeline and linked signal collections.",
            });
        }

        {
            const response = await updateIncident(
                makeRequest(`/api/incidents/${incidentId}`, {
                    method: "PATCH",
                    token: adminToken,
                    body: {
                        status: "IN_PROGRESS",
                        severity: "CRITICAL",
                        affectedCount: 25,
                        description: "Verification incident updated to critical response.",
                        updateMessage: "Verification update saved successfully.",
                    },
                }),
                { params: Promise.resolve({ id: incidentId }) },
            );
            const { status, payload } = await parseResponse(response);
            const updated = payload as { status?: string; severity?: string; updates?: Array<{ message?: string }> } | null;
            const hasTimelineEntry = Array.isArray(updated?.updates) && updated!.updates.some((entry) => entry.message === "Verification update saved successfully.");
            results.push({
                name: "PATCH /api/incidents/[id] updates status and timeline",
                ok: status === 200 && updated?.status === "IN_PROGRESS" && updated?.severity === "CRITICAL" && hasTimelineEntry,
                status,
                details: "Incident update returned the new state and timeline note.",
            });
        }

        console.log(JSON.stringify({
            checkedAt: new Date().toISOString(),
            users: {
                admin: { email: admin.email, role: admin.role },
                telco: { email: telco.email, role: telco.role },
            },
            results,
        }, null, 2));
    } finally {
        if (createdIds.length > 0) {
            await prisma.incidentUpdate.deleteMany({ where: { incidentId: { in: createdIds } } });
            await prisma.incident.deleteMany({ where: { id: { in: createdIds } } });
        }
    }
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        const { prisma } = await import("@/lib/db/prisma");
        await prisma.$disconnect();
    });
