// Prisma Seed — Nairobi Flood-Prone Areas + Initial Users
// Run: npx tsx prisma/seed.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);


async function main() {
    console.log("🌊 Seeding FloodGuard database with Nairobi data...\n");

    // ─── ORGANIZATIONS ──────────────────────────────────────────────────────────
    console.log("Creating organizations...");

    const floodguardOrg = await prisma.organization.upsert({
        where: { id: "org-floodguard" },
        update: {},
        create: {
            id: "org-floodguard",
            name: "FloodGuard Platform",
            type: "ADMIN",
            description: "Platform administration organization",
            contactEmail: "admin@floodguard.ke",
            isActive: true,
        },
    });

    const redCrossOrg = await prisma.organization.upsert({
        where: { id: "org-redcross" },
        update: {},
        create: {
            id: "org-redcross",
            name: "Kenya Red Cross",
            type: "DISASTER_MANAGEMENT",
            description: "Kenya Red Cross disaster response team",
            contactEmail: "coordinator@redcross.ke",
            isActive: true,
        },
    });

    const safaricomOrg = await prisma.organization.upsert({
        where: { id: "org-safaricom" },
        update: {},
        create: {
            id: "org-safaricom",
            name: "Safaricom PLC",
            type: "TELCO",
            description: "Primary SMS delivery partner",
            contactEmail: "operator@safaricom.ke",
            isActive: true,
        },
    });

    console.log("✅ Organizations created\n");

    // ─── USERS ──────────────────────────────────────────────────────────────────
    console.log("Creating users...");
    const hashedPass = await bcrypt.hash("pass123", 10);

    await prisma.user.upsert({
        where: { email: "admin@floodguard.ke" },
        update: {},
        create: {
            email: "admin@floodguard.ke",
            name: "FloodGuard Admin",
            hashedPassword: hashedPass,
            role: "ADMIN",
            organizationId: floodguardOrg.id,
            isActive: true,
        },
    });

    await prisma.user.upsert({
        where: { email: "coordinator@redcross.ke" },
        update: {},
        create: {
            email: "coordinator@redcross.ke",
            name: "Red Cross Coordinator",
            hashedPassword: hashedPass,
            role: "DISASTER_MANAGER",
            organizationId: redCrossOrg.id,
            isActive: true,
        },
    });

    await prisma.user.upsert({
        where: { email: "operator@safaricom.ke" },
        update: {},
        create: {
            email: "operator@safaricom.ke",
            name: "Safaricom Operator",
            hashedPassword: hashedPass,
            role: "TELCO_OPERATOR",
            organizationId: safaricomOrg.id,
            isActive: true,
        },
    });

    console.log("✅ Users created (password: pass123)\n");

    // ─── NAIROBI LOCATIONS ──────────────────────────────────────────────────────
    console.log("Creating Nairobi flood-prone locations...");

    const locations = [
        {
            id: "loc-kibera",
            name: "Kibera",
            county: "Nairobi",
            subCounty: "Langata",
            ward: "Kibera",
            latitude: -1.3133,
            longitude: 36.7872,
            population: 250000,
            areaKm2: 2.5,
            isUrban: true,
        },
        {
            id: "loc-mathare",
            name: "Mathare Valley",
            county: "Nairobi",
            subCounty: "Mathare",
            ward: "Mathare North",
            latitude: -1.2627,
            longitude: 36.8598,
            population: 160000,
            areaKm2: 1.8,
            isUrban: true,
        },
        {
            id: "loc-mukuru",
            name: "Mukuru kwa Njenga",
            county: "Nairobi",
            subCounty: "Makadara",
            ward: "Mukuru kwa Njenga",
            latitude: -1.3192,
            longitude: 36.8645,
            population: 180000,
            areaKm2: 2.1,
            isUrban: true,
        },
        {
            id: "loc-kawangware",
            name: "Kawangware",
            county: "Nairobi",
            subCounty: "Dagoretti North",
            ward: "Kawangware",
            latitude: -1.2779,
            longitude: 36.7483,
            population: 130000,
            areaKm2: 2.8,
            isUrban: true,
        },
        {
            id: "loc-embakasi",
            name: "Embakasi",
            county: "Nairobi",
            subCounty: "Embakasi Central",
            ward: "Embakasi",
            latitude: -1.3229,
            longitude: 36.9065,
            population: 145000,
            areaKm2: 6.5,
            isUrban: true,
        },
        {
            id: "loc-korogocho",
            name: "Korogocho",
            county: "Nairobi",
            subCounty: "Ruaraka",
            ward: "Korogocho",
            latitude: -1.2332,
            longitude: 36.8952,
            population: 100000,
            areaKm2: 1.5,
            isUrban: true,
        },
        {
            id: "loc-ruiru",
            name: "Ruiru Town",
            county: "Kiambu",
            subCounty: "Thika Road",
            ward: "Ruiru",
            latitude: -1.1465,
            longitude: 36.9608,
            population: 85000,
            areaKm2: 12.0,
            isUrban: false,
        },
        {
            id: "loc-athi-river",
            name: "Athi River",
            county: "Machakos",
            subCounty: "Gatundu",
            ward: "Athi River",
            latitude: -1.4542,
            longitude: 36.9824,
            population: 70000,
            areaKm2: 15.0,
            isUrban: false,
        },
        {
            id: "loc-lower-kabete",
            name: "Lower Kabete",
            county: "Kiambu",
            subCounty: "Kabete",
            ward: "Lower Kabete",
            latitude: -1.2317,
            longitude: 36.7456,
            population: 55000,
            areaKm2: 8.0,
            isUrban: false,
        },
        {
            id: "loc-njiru",
            name: "Njiru",
            county: "Nairobi",
            subCounty: "Njiru",
            ward: "Njiru",
            latitude: -1.2512,
            longitude: 36.9842,
            population: 78000,
            areaKm2: 10.5,
            isUrban: false,
        },
    ];

    for (const loc of locations) {
        await prisma.location.upsert({
            where: { id: loc.id },
            update: {},
            create: loc as Parameters<typeof prisma.location.create>[0]["data"],
        });
    }

    console.log(`✅ ${locations.length} locations created\n`);

    // ─── FLOOD ZONES ────────────────────────────────────────────────────────────
    console.log("Creating Nairobi flood zones...");

    const floodZones = [
        {
            id: "fz-kibera",
            name: "Kibera Flood Zone",
            code: "NBI-FZ-001",
            locationId: "loc-kibera",
            organizationId: redCrossOrg.id,
            riskLevel: "CRITICAL" as const,
            drainageScore: 15,        // very poor drainage
            riverProximityKm: 0.2,    // near Nairobi River
            elevationM: 1671,
            historicalFloodScore: 90, // frequently floods
            population: 250000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.7820, -1.3100], [36.7920, -1.3100],
                    [36.7920, -1.3170], [36.7820, -1.3170], [36.7820, -1.3100],
                ]],
            },
        },
        {
            id: "fz-mathare",
            name: "Mathare Valley Flood Zone",
            code: "NBI-FZ-002",
            locationId: "loc-mathare",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 20,
            riverProximityKm: 0.1,   // on Mathare River
            elevationM: 1590,
            historicalFloodScore: 85,
            population: 160000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8550, -1.2600], [36.8650, -1.2600],
                    [36.8650, -1.2660], [36.8550, -1.2660], [36.8550, -1.2600],
                ]],
            },
        },
        {
            id: "fz-mukuru",
            name: "Mukuru kwa Njenga Flood Zone",
            code: "NBI-FZ-003",
            locationId: "loc-mukuru",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 25,
            riverProximityKm: 0.3,
            elevationM: 1600,
            historicalFloodScore: 80,
            population: 180000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8600, -1.3160], [36.8700, -1.3160],
                    [36.8700, -1.3230], [36.8600, -1.3230], [36.8600, -1.3160],
                ]],
            },
        },
        {
            id: "fz-kawangware",
            name: "Kawangware Flood Zone",
            code: "NBI-FZ-004",
            locationId: "loc-kawangware",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 40,
            riverProximityKm: 1.2,
            elevationM: 1700,
            historicalFloodScore: 55,
            population: 130000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.7430, -1.2750], [36.7540, -1.2750],
                    [36.7540, -1.2820], [36.7430, -1.2820], [36.7430, -1.2750],
                ]],
            },
        },
        {
            id: "fz-embakasi",
            name: "Embakasi Plains Flood Zone",
            code: "NBI-FZ-005",
            locationId: "loc-embakasi",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 30,
            riverProximityKm: 0.5,
            elevationM: 1545,
            historicalFloodScore: 70,
            population: 145000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8950, -1.3190], [36.9100, -1.3190],
                    [36.9100, -1.3280], [36.8950, -1.3280], [36.8950, -1.3190],
                ]],
            },
        },
        {
            id: "fz-korogocho",
            name: "Korogocho Flood Zone",
            code: "NBI-FZ-006",
            locationId: "loc-korogocho",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 22,
            riverProximityKm: 0.15,
            elevationM: 1580,
            historicalFloodScore: 78,
            population: 100000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8900, -1.2300], [36.9000, -1.2300],
                    [36.9000, -1.2370], [36.8900, -1.2370], [36.8900, -1.2300],
                ]],
            },
        },
        {
            id: "fz-ruiru",
            name: "Ruiru Lowlands Flood Zone",
            code: "KBU-FZ-001",
            locationId: "loc-ruiru",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 45,
            riverProximityKm: 0.8,
            elevationM: 1503,
            historicalFloodScore: 45,
            population: 85000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9550, -1.1430], [36.9670, -1.1430],
                    [36.9670, -1.1510], [36.9550, -1.1510], [36.9550, -1.1430],
                ]],
            },
        },
        {
            id: "fz-athi",
            name: "Athi River Basin Flood Zone",
            code: "MKS-FZ-001",
            locationId: "loc-athi-river",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 50,
            riverProximityKm: 0.1,  // on Athi River
            elevationM: 1484,
            historicalFloodScore: 60,
            population: 70000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9770, -1.4510], [36.9880, -1.4510],
                    [36.9880, -1.4590], [36.9770, -1.4590], [36.9770, -1.4510],
                ]],
            },
        },
    ];

    for (const zone of floodZones) {
        await prisma.floodZone.upsert({
            where: { id: zone.id },
            update: {
                riskLevel: zone.riskLevel,
                drainageScore: zone.drainageScore,
            },
            create: zone as Parameters<typeof prisma.floodZone.create>[0]["data"],
        });
    }

    console.log(`✅ ${floodZones.length} flood zones created\n`);

    // ─── HOSPITALS ──────────────────────────────────────────────────────────────
    console.log("Creating Nairobi hospitals...");

    const hospitals = [
        { id: "hosp-knh", name: "Kenyatta National Hospital", locationId: "loc-kibera", address: "Hospital Rd, Nairobi", beds: 2000, hasEmergency: true, latitude: -1.3006, longitude: 36.8073, contactPhone: "+254202726300" },
        { id: "hosp-mathare", name: "Mathare Hospital", locationId: "loc-mathare", address: "Thika Rd, Nairobi", beds: 600, hasEmergency: true, latitude: -1.2619, longitude: 36.8573, contactPhone: "+254202652500" },
        { id: "hosp-mama", name: "Mama Lucy Kibaki Hospital", locationId: "loc-embakasi", address: "Embakasi, Nairobi", beds: 250, hasEmergency: true, latitude: -1.2889, longitude: 36.9083, contactPhone: "+254202601200" },
        { id: "hosp-langata", name: "Langata Hospital", locationId: "loc-kibera", address: "Langata Rd, Nairobi", beds: 180, hasEmergency: true, latitude: -1.3342, longitude: 36.7672, contactPhone: "+254202050000" },
    ];

    for (const hosp of hospitals) {
        await prisma.hospital.upsert({
            where: { id: hosp.id },
            update: {},
            create: hosp,
        });
    }
    console.log("✅ Hospitals created\n");

    // ─── SHELTERS ───────────────────────────────────────────────────────────────
    console.log("Creating emergency shelters...");

    const shelters = [
        { id: "shlt-olympic", name: "Olympic Primary School Shelter", locationId: "loc-kibera", address: "Olympic Estate, Kibera", capacity: 500, latitude: -1.3120, longitude: 36.7980, contactPhone: "+254700000001" },
        { id: "shlt-mathare-pri", name: "Mathare Primary School Shelter", locationId: "loc-mathare", address: "Mathare North", capacity: 350, latitude: -1.2580, longitude: 36.8610, contactPhone: "+254700000002" },
        { id: "shlt-mukuru-comm", name: "Mukuru Community Centre Shelter", locationId: "loc-mukuru", address: "Mukuru kwa Njenga", capacity: 400, latitude: -1.3180, longitude: 36.8660, contactPhone: "+254700000003" },
        { id: "shlt-ruiru-stadium", name: "Ruiru Stadium Emergency Shelter", locationId: "loc-ruiru", address: "Ruiru Town", capacity: 800, latitude: -1.1450, longitude: 36.9620, contactPhone: "+254700000004" },
        { id: "shlt-embakasi-pri", name: "Embakasi Primary School Shelter", locationId: "loc-embakasi", address: "Embakasi", capacity: 300, latitude: -1.3200, longitude: 36.9090, contactPhone: "+254700000005" },
    ];

    for (const shelter of shelters) {
        await prisma.shelter.upsert({
            where: { id: shelter.id },
            update: {},
            create: shelter,
        });
    }
    console.log("✅ Shelters created\n");

    // ─── WEATHER PROVIDER CONFIGS ───────────────────────────────────────────────
    console.log("Creating weather provider configs...");

    await prisma.weatherProviderConfig.upsert({
        where: { id: "wp-tomorrow" },
        update: {},
        create: {
            id: "wp-tomorrow",
            provider: "TOMORROW_IO",
            apiKey: process.env.TOMORROW_API_KEY || "",
            baseUrl: "https://api.tomorrow.io/v4",
            isActive: true,
            isPrimary: true,
        },
    });

    await prisma.weatherProviderConfig.upsert({
        where: { id: "wp-openweather" },
        update: {},
        create: {
            id: "wp-openweather",
            provider: "OPENWEATHER",
            apiKey: process.env.OPENWEATHER_API_KEY || "",
            baseUrl: "https://api.openweathermap.org/data/2.5",
            isActive: true,
            isPrimary: false,
        },
    });

    console.log("✅ Weather providers configured\n");

    // ─── RESCUE RESOURCES ───────────────────────────────────────────────────────
    console.log("Creating rescue resources...");

    const resources = [
        { id: "res-boat-1", name: "Rescue Boat Alpha", type: "BOAT" as const, organizationId: redCrossOrg.id, capacity: 15, isAvailable: true, contactPhone: "+254700100001" },
        { id: "res-boat-2", name: "Rescue Boat Beta", type: "BOAT" as const, organizationId: redCrossOrg.id, capacity: 12, isAvailable: true, contactPhone: "+254700100002" },
        { id: "res-med-1", name: "Medical Team Nairobi 1", type: "MEDICAL_TEAM" as const, organizationId: redCrossOrg.id, capacity: 8, isAvailable: true, contactPhone: "+254700100003" },
        { id: "res-med-2", name: "Medical Team Nairobi 2", type: "MEDICAL_TEAM" as const, organizationId: redCrossOrg.id, capacity: 8, isAvailable: true, contactPhone: "+254700100004" },
        { id: "res-rescue-1", name: "Ground Rescue Team Alpha", type: "RESCUE_TEAM" as const, organizationId: redCrossOrg.id, capacity: 20, isAvailable: true, contactPhone: "+254700100005" },
        { id: "res-truck-1", name: "Supply Truck 1", type: "SUPPLY_TRUCK" as const, organizationId: redCrossOrg.id, capacity: 50, isAvailable: true, contactPhone: "+254700100006" },
    ];

    for (const resource of resources) {
        await prisma.rescueResource.upsert({
            where: { id: resource.id },
            update: {},
            create: resource,
        });
    }
    console.log("✅ Rescue resources created\n");

    // ─── SYSTEM HEALTH CHECKS ───────────────────────────────────────────────────
    console.log("Creating initial system health checks...");

    const services = [
        { service: "database", status: "UP" as const, responseMs: 45, message: "Connected to Neon PostgreSQL" },
        { service: "tomorrow_io_api", status: "UP" as const, responseMs: 320, message: "API responding" },
        { service: "openweather_api", status: "UP" as const, responseMs: 280, message: "API responding" },
        { service: "sms_gateway", status: "UP" as const, responseMs: 150, message: "textsms.co.ke connected" },
    ];

    for (const check of services) {
        await prisma.systemHealthCheck.create({ data: check });
    }
    console.log("✅ System health checks created\n");

    console.log("🎉 FloodGuard database seeding complete!");
    console.log("\n📋 Login credentials:");
    console.log("   admin@floodguard.ke     → ADMIN            (pass123)");
    console.log("   coordinator@redcross.ke → DISASTER_MANAGER (pass123)");
    console.log("   operator@safaricom.ke   → TELCO_OPERATOR   (pass123)");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
