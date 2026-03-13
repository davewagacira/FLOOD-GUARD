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
    const [
        { prisma },
        authModule,
        ngoModule,
        distressModule,
        distressItemModule,
        rescueModule,
        rescueItemModule,
        rescueDeployModule,
    ] = await Promise.all([
        import("@/lib/db/prisma"),
        import("@/lib/server-auth"),
        import("@/app/api/dashboard/ngo/route"),
        import("@/app/api/distress-signals/route"),
        import("@/app/api/distress-signals/[id]/route"),
        import("@/app/api/rescue-resources/route"),
        import("@/app/api/rescue-resources/[id]/route"),
        import("@/app/api/rescue-resources/[id]/deploy/route"),
    ]);

    const { createSessionToken } = authModule;
    const { GET: getNgoDashboard } = ngoModule;
    const { GET: getDistressSignals } = distressModule;
    const { PATCH: updateDistressSignal } = distressItemModule;
    const { GET: getRescueResources, POST: createRescueResource } = rescueModule;
    const { PATCH: updateRescueResource } = rescueItemModule;
    const { POST: handleDeployment } = rescueDeployModule;

    const users = await prisma.user.findMany({
        where: { isActive: true, role: { in: ["DISASTER_MANAGER", "TELCO_OPERATOR"] } },
        select: { id: true, email: true, role: true, organizationId: true },
    });

    const disasterManager = users.find((user) => user.role === "DISASTER_MANAGER");
    const telco = users.find((user) => user.role === "TELCO_OPERATOR");
    if (!disasterManager || !telco) {
        throw new Error("Required disaster manager or telco user missing for verification.");
    }

    const disasterToken = createSessionToken(disasterManager.id, disasterManager.email, disasterManager.role);
    const telcoToken = createSessionToken(telco.id, telco.email, telco.role);

    const createdIds = {
        distressSignalId: "",
        incidentId: "",
        rescueResourceId: "",
        deploymentId: "",
    };
    const results: TestResult[] = [];

    try {
        {
            const response = await getNgoDashboard(makeRequest("/api/dashboard/ngo", { token: disasterToken }));
            const { status, payload } = await parseResponse(response);
            const hasMetrics = Boolean(payload && typeof payload === "object" && "metrics" in payload);
            results.push({
                name: "GET /api/dashboard/ngo returns disaster overview",
                ok: status === 200 && hasMetrics,
                status,
                details: "Dashboard overview returned live disaster metrics.",
            });
        }

        {
            const response = await getNgoDashboard(makeRequest("/api/dashboard/ngo", { token: telcoToken }));
            const { status } = await parseResponse(response);
            results.push({
                name: "GET /api/dashboard/ngo blocks telco access",
                ok: status === 403,
                status,
                details: "Telco users should not access disaster-management metrics.",
            });
        }

        {
            const response = await getDistressSignals(makeRequest("/api/distress-signals", { token: disasterToken }));
            const { status, payload } = await parseResponse(response);
            results.push({
                name: "GET /api/distress-signals returns live signals",
                ok: status === 200 && Array.isArray(payload),
                status,
                details: `Returned ${Array.isArray(payload) ? payload.length : 0} distress signals.`,
            });
        }

        const distressSignal = await prisma.distressSignal.create({
            data: {
                phoneNumber: "254700123321",
                rawMessage: "Need evacuation assistance immediately",
                signalType: "NEED_HELP",
                status: "RECEIVED",
            },
        });
        createdIds.distressSignalId = distressSignal.id;

        {
            const response = await updateDistressSignal(
                makeRequest(`/api/distress-signals/${distressSignal.id}`, {
                    method: "PATCH",
                    token: disasterToken,
                    body: {
                        status: "ASSIGNED",
                        createIncident: true,
                        note: "Verification incident created from distress signal.",
                    },
                }),
                { params: Promise.resolve({ id: distressSignal.id }) },
            );
            const { status, payload } = await parseResponse(response);
            const updated = payload as { incident?: { id?: string }; status?: string } | null;
            createdIds.incidentId = updated?.incident?.id ?? "";
            results.push({
                name: "PATCH /api/distress-signals/[id] can create linked incident",
                ok: status === 200 && updated?.status === "ASSIGNED" && Boolean(createdIds.incidentId),
                status,
                details: "Distress signal update created and linked a live incident.",
            });
        }

        {
            const response = await createRescueResource(makeRequest("/api/rescue-resources", {
                method: "POST",
                token: disasterToken,
                body: {
                    name: "Verification Rescue Truck",
                    type: "TRUCK",
                    capacity: 6,
                    contactPhone: "0700111222",
                    latitude: -1.285,
                    longitude: 36.821,
                },
            }));
            const { status, payload } = await parseResponse(response);
            const created = payload as { id?: string } | null;
            createdIds.rescueResourceId = created?.id ?? "";
            results.push({
                name: "POST /api/rescue-resources creates a live resource",
                ok: status === 201 && Boolean(createdIds.rescueResourceId),
                status,
                details: createdIds.rescueResourceId ? `Created resource ${createdIds.rescueResourceId}.` : "Resource creation failed to return an id.",
            });
        }

        {
            const response = await updateRescueResource(
                makeRequest(`/api/rescue-resources/${createdIds.rescueResourceId}`, {
                    method: "PATCH",
                    token: disasterToken,
                    body: {
                        capacity: 8,
                        contactPhone: "0700999888",
                    },
                }),
                { params: Promise.resolve({ id: createdIds.rescueResourceId }) },
            );
            const { status, payload } = await parseResponse(response);
            const updated = payload as { capacity?: number; contactPhone?: string } | null;
            results.push({
                name: "PATCH /api/rescue-resources/[id] updates a live resource",
                ok: status === 200 && updated?.capacity === 8 && updated?.contactPhone === "0700999888",
                status,
                details: "Rescue resource update succeeded.",
            });
        }

        {
            const response = await handleDeployment(
                makeRequest(`/api/rescue-resources/${createdIds.rescueResourceId}/deploy`, {
                    method: "POST",
                    token: disasterToken,
                    body: { incidentId: createdIds.incidentId, action: "dispatch" },
                }),
                { params: Promise.resolve({ id: createdIds.rescueResourceId }) },
            );
            const { status, payload } = await parseResponse(response);
            const deployment = payload as { id?: string; status?: string } | null;
            createdIds.deploymentId = deployment?.id ?? "";
            results.push({
                name: "POST /api/rescue-resources/[id]/deploy dispatches to an incident",
                ok: status === 201 && deployment?.status === "DISPATCHED",
                status,
                details: "Rescue deployment was created successfully.",
            });
        }

        {
            const response = await handleDeployment(
                makeRequest(`/api/rescue-resources/${createdIds.rescueResourceId}/deploy`, {
                    method: "POST",
                    token: disasterToken,
                    body: { incidentId: createdIds.incidentId, action: "complete" },
                }),
                { params: Promise.resolve({ id: createdIds.rescueResourceId }) },
            );
            const { status, payload } = await parseResponse(response);
            const deployment = payload as { status?: string } | null;
            results.push({
                name: "POST /api/rescue-resources/[id]/deploy can complete a deployment",
                ok: status === 200 && deployment?.status === "COMPLETED",
                status,
                details: "Rescue deployment completion returned the resource to available state.",
            });
        }

        {
            const response = await getRescueResources(makeRequest("/api/rescue-resources", { token: disasterToken }));
            const { status, payload } = await parseResponse(response);
            results.push({
                name: "GET /api/rescue-resources returns operational inventory",
                ok: status === 200 && Array.isArray(payload),
                status,
                details: `Returned ${Array.isArray(payload) ? payload.length : 0} rescue resources.`,
            });
        }

        console.log(JSON.stringify({
            checkedAt: new Date().toISOString(),
            users: {
                disasterManager: { email: disasterManager.email, role: disasterManager.role },
                telco: { email: telco.email, role: telco.role },
            },
            results,
        }, null, 2));
    } finally {
        if (createdIds.deploymentId) {
            await prisma.deployment.deleteMany({ where: { id: createdIds.deploymentId } });
        }
        if (createdIds.rescueResourceId) {
            await prisma.rescueResource.deleteMany({ where: { id: createdIds.rescueResourceId } });
        }
        if (createdIds.incidentId) {
            await prisma.incidentUpdate.deleteMany({ where: { incidentId: createdIds.incidentId } });
            await prisma.incident.deleteMany({ where: { id: createdIds.incidentId } });
        }
        if (createdIds.distressSignalId) {
            await prisma.distressSignal.deleteMany({ where: { id: createdIds.distressSignalId } });
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
