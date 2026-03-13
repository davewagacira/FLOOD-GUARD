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
    const [{ prisma }, authModule, floodZonesModule, floodMapModule, nearbyModule, zoneWeatherModule, weatherIngestModule, zoneItemModule] = await Promise.all([
        import("@/lib/db/prisma"),
        import("@/lib/server-auth"),
        import("@/app/api/flood-zones/route"),
        import("@/app/api/flood-zones/map/route"),
        import("@/app/api/flood-zones/[id]/nearby/route"),
        import("@/app/api/flood-zones/[id]/weather/route"),
        import("@/app/api/weather/ingest/route"),
        import("@/app/api/flood-zones/[id]/route"),
    ]);
    const { createSessionToken } = authModule;
    const { GET: getFloodZones, POST: createFloodZone } = floodZonesModule;
    const { GET: getFloodMap } = floodMapModule;
    const { GET: getNearby } = nearbyModule;
    const { GET: getZoneWeather, POST: refreshZoneWeather } = zoneWeatherModule;
    const { POST: ingestWeather } = weatherIngestModule;
    const { PATCH: updateFloodZone, DELETE: deleteFloodZone } = zoneItemModule;

    const users = await prisma.user.findMany({
        where: { isActive: true, role: { in: ["ADMIN", "DISASTER_MANAGER", "TELCO_OPERATOR"] } },
        select: { id: true, email: true, role: true },
        orderBy: { createdAt: "asc" },
    });

    const admin = users.find((user) => user.role === "ADMIN");
    const telco = users.find((user) => user.role === "TELCO_OPERATOR") ?? admin;

    if (!admin) {
        throw new Error("No active ADMIN user found for API verification.");
    }

    if (!telco) {
        throw new Error("No active TELCO_OPERATOR or ADMIN fallback user found for API verification.");
    }

    const adminToken = createSessionToken(admin.id, admin.email, admin.role);
    const telcoToken = createSessionToken(telco.id, telco.email, telco.role);

    const firstZone = await prisma.floodZone.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
    });

    if (!firstZone) {
        throw new Error("No active flood zone found for API verification.");
    }

    const results: TestResult[] = [];

    {
        const response = await getFloodMap(makeRequest("/api/flood-zones/map"));
        const { status } = await parseResponse(response);
        results.push({
            name: "GET /api/flood-zones/map requires auth",
            ok: status === 401,
            status,
            details: "Unauthenticated request should be rejected.",
        });
    }

    {
        const response = await getFloodMap(makeRequest("/api/flood-zones/map", { token: telcoToken }));
        const { status, payload } = await parseResponse(response);
        const zones = Array.isArray(payload) ? payload : [];
        const first = zones[0] as Record<string, unknown> | undefined;
        const hasFreshnessFlags = typeof first?.riskDataFresh === "boolean" && typeof first?.weatherDataFresh === "boolean";

        results.push({
            name: "GET /api/flood-zones/map returns live map payload",
            ok: status === 200 && zones.length > 0 && hasFreshnessFlags,
            status,
            details: `Returned ${zones.length} zones${hasFreshnessFlags ? " with freshness flags." : " but freshness flags were missing."}`,
        });
    }

    {
        const response = await getFloodZones(makeRequest("/api/flood-zones", { token: telcoToken }));
        const { status, payload } = await parseResponse(response);
        const zones = Array.isArray(payload) ? payload : [];

        results.push({
            name: "GET /api/flood-zones returns authenticated zone list",
            ok: status === 200 && zones.length > 0,
            status,
            details: `Returned ${zones.length} zones for authenticated access.`,
        });
    }

    {
        const response = await createFloodZone(makeRequest("/api/flood-zones", {
            method: "POST",
            token: telcoToken,
            body: {
                name: "Unauthorized Test Zone",
                code: "unauthorized-test-zone",
                county: "Nairobi",
                population: 0,
                latitude: -1.28,
                longitude: 36.82,
                polygonCoordinates: [],
            },
        }));
        const { status } = await parseResponse(response);

        results.push({
            name: "POST /api/flood-zones blocks telco operators",
            ok: status === 403 || status === 401,
            status,
            details: "Telco users should not be able to create flood zones.",
        });
    }

    {
        const response = await getNearby(
            makeRequest(`/api/flood-zones/${firstZone.id}/nearby`, { token: telcoToken }),
            { params: Promise.resolve({ id: firstZone.id }) },
        );
        const { status, payload } = await parseResponse(response);
        const nearby = payload && typeof payload === "object" && "nearby" in payload && Array.isArray((payload as { nearby?: unknown[] }).nearby)
            ? (payload as { nearby: unknown[] }).nearby
            : [];

        results.push({
            name: "GET /api/flood-zones/[id]/nearby uses local infrastructure data",
            ok: status === 200 && nearby.length > 0,
            status,
            details: `Returned ${nearby.length} nearby infrastructure groups for ${firstZone.name}.`,
        });
    }

    {
        const response = await getZoneWeather(
            makeRequest(`/api/flood-zones/${firstZone.id}/weather`, { token: telcoToken }),
            { params: Promise.resolve({ id: firstZone.id }) },
        );
        const { status, payload } = await parseResponse(response);
        const hasZone = Boolean(payload && typeof payload === "object" && "zone" in payload);

        results.push({
            name: "GET /api/flood-zones/[id]/weather returns zone weather details",
            ok: status === 200 && hasZone,
            status,
            details: `Weather detail payload ${hasZone ? "included" : "did not include"} the zone record.`,
        });
    }

    {
        const response = await refreshZoneWeather(
            makeRequest(`/api/flood-zones/${firstZone.id}/weather`, { method: "POST", token: telcoToken }),
            { params: Promise.resolve({ id: firstZone.id }) },
        );
        const { status } = await parseResponse(response);

        results.push({
            name: "POST /api/flood-zones/[id]/weather blocks telco operators",
            ok: status === 403 || status === 401,
            status,
            details: "Telco users should not be able to force-refresh zone weather.",
        });
    }

    {
        const response = await updateFloodZone(
            makeRequest(`/api/flood-zones/${firstZone.id}`, {
                method: "PATCH",
                token: telcoToken,
                body: { riskLevel: "LOW" },
            }),
            { params: Promise.resolve({ id: firstZone.id }) },
        );
        const { status } = await parseResponse(response);

        results.push({
            name: "PATCH /api/flood-zones/[id] blocks telco operators",
            ok: status === 403 || status === 401,
            status,
            details: "Telco users should not be able to edit flood zones.",
        });
    }

    {
        const response = await deleteFloodZone(
            makeRequest(`/api/flood-zones/${firstZone.id}`, {
                method: "DELETE",
                token: telcoToken,
            }),
            { params: Promise.resolve({ id: firstZone.id }) },
        );
        const { status } = await parseResponse(response);

        results.push({
            name: "DELETE /api/flood-zones/[id] blocks telco operators",
            ok: status === 403 || status === 401,
            status,
            details: "Telco users should not be able to delete flood zones.",
        });
    }

    {
        const response = await refreshZoneWeather(
            makeRequest(`/api/flood-zones/${firstZone.id}/weather`, { method: "POST", token: adminToken }),
            { params: Promise.resolve({ id: firstZone.id }) },
        );
        const { status, payload } = await parseResponse(response);
        const success = Boolean(payload && typeof payload === "object" && "snapshot" in payload && "assessment" in payload);

        results.push({
            name: "POST /api/flood-zones/[id]/weather refreshes weather for admins",
            ok: status === 200 && success,
            status,
            details: success ? `Admin weather refresh succeeded for ${firstZone.name}.` : "Admin weather refresh did not return snapshot and assessment.",
        });
    }

    {
        const response = await ingestWeather(makeRequest("/api/weather/ingest", { method: "POST" }));
        const { status } = await parseResponse(response);
        results.push({
            name: "POST /api/weather/ingest requires auth",
            ok: status === 401,
            status,
            details: "Unauthenticated ingest requests should be rejected.",
        });
    }

    {
        const response = await ingestWeather(makeRequest("/api/weather/ingest", { method: "POST", token: adminToken }));
        const { status, payload } = await parseResponse(response);
        const success = Boolean(payload && typeof payload === "object" && (payload as { success?: boolean }).success);

        results.push({
            name: "POST /api/weather/ingest runs for admins",
            ok: status === 200 && success,
            status,
            details: success ? "Admin ingest completed successfully." : "Admin ingest did not report success.",
        });
    }

    console.log(JSON.stringify({
        checkedAt: new Date().toISOString(),
        zoneUnderTest: firstZone,
        users: {
            admin: { email: admin.email, role: admin.role },
            telco: { email: telco.email, role: telco.role },
        },
        results,
    }, null, 2));
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
