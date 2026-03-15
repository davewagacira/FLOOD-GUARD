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


    console.log("✅ Organizations created\n");

    // ─── USERS ──────────────────────────────────────────────────────────────────
    console.log("Creating users...");
    const hashedPass = await bcrypt.hash("Pass@123#", 10);

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

    console.log("✅ Users created (password: Pass@123#)\n");

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
            population: 408000,
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
            population: 180000,
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
            population: 661885,
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
            population: 925775,
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
            population: 175000,
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
            population: 371111,
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
            population: 24530,
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
            population: 626482,
            areaKm2: 10.5,
            isUrban: false,
        },
        {
            id: "loc-ruai",
            name: "Ruai",
            county: "Nairobi",
            subCounty: "Kasarani",
            ward: "Ruai",
            latitude: -1.2456,
            longitude: 37.0054,
            population: 72134,
            areaKm2: 14.2,
            isUrban: false,
        },
        {
            id: "loc-dandora",
            name: "Dandora",
            county: "Nairobi",
            subCounty: "Embakasi North",
            ward: "Dandora Area",
            latitude: -1.2397,
            longitude: 36.8984,
            population: 150000,
            areaKm2: 5.4,
            isUrban: true,
        },
        {
            id: "loc-kiambiu",
            name: "Kiambiu",
            county: "Nairobi",
            subCounty: "Kamukunji",
            ward: "Eastleigh South",
            latitude: -1.2674,
            longitude: 36.8619,
            population: 45000,
            areaKm2: 2.0,
            isUrban: true,
        },
        {
            id: "loc-githogoro",
            name: "Githogoro",
            county: "Nairobi",
            subCounty: "Westlands",
            ward: "Karura",
            latitude: -1.2298,
            longitude: 36.8126,
            population: 20000,
            areaKm2: 1.2,
            isUrban: true,
        },
        {
            id: "loc-kangemi",
            name: "Kangemi",
            county: "Nairobi",
            subCounty: "Westlands",
            ward: "Kangemi",
            latitude: -1.2682,
            longitude: 36.7448,
            population: 100000,
            areaKm2: 3.1,
            isUrban: true,
        },
        {
            id: "loc-waruku",
            name: "Waruku",
            county: "Nairobi",
            subCounty: "Westlands",
            ward: "Kangemi",
            latitude: -1.2712,
            longitude: 36.7708,
            population: 15000,
            areaKm2: 1.6,
            isUrban: true,
        },
        {
            id: "loc-parklands",
            name: "Westlands-Parklands",
            county: "Nairobi",
            subCounty: "Westlands",
            ward: "Parklands/Highridge",
            latitude: -1.2554,
            longitude: 36.8138,
            population: 85000,
            areaKm2: 4.3,
            isUrban: true,
        },
        {
            id: "loc-gikomba",
            name: "Gikomba",
            county: "Nairobi",
            subCounty: "Kamukunji",
            ward: "Pumwani",
            latitude: -1.2845,
            longitude: 36.8502,
            population: 25000,
            areaKm2: 1.9,
            isUrban: true,
        },
        {
            id: "loc-highrise",
            name: "Highrise",
            county: "Nairobi",
            subCounty: "Kibra",
            ward: "Highrise",
            latitude: -1.3084,
            longitude: 36.8046,
            population: 50000,
            areaKm2: 2.4,
            isUrban: true,
        },
        {
            id: "loc-maziwa",
            name: "Maziwa",
            county: "Nairobi",
            subCounty: "Roysambu",
            ward: "Zimmerman",
            latitude: -1.2184,
            longitude: 36.8835,
            population: 49533,
            areaKm2: 3.7,
            isUrban: true,
        },
        {
            id: "loc-kahawa-west",
            name: "Kahawa West",
            county: "Nairobi",
            subCounty: "Roysambu",
            ward: "Kahawa West",
            latitude: -1.1838,
            longitude: 36.9342,
            population: 100000,
            areaKm2: 6.0,
            isUrban: true,
        },
        {
            id: "loc-donholm",
            name: "Donholm",
            county: "Nairobi",
            subCounty: "Embakasi East",
            ward: "Umoja I",
            latitude: -1.2841,
            longitude: 36.9138,
            population: 150000,
            areaKm2: 6.8,
            isUrban: true,
        },
        {
            id: "loc-utawala",
            name: "Utawala",
            county: "Nairobi",
            subCounty: "Embakasi East",
            ward: "Mihango",
            latitude: -1.2849,
            longitude: 36.9575,
            population: 50000,
            areaKm2: 9.1,
            isUrban: true,
        },
    ];

    for (const loc of locations) {
        await prisma.location.upsert({
            where: { id: loc.id },
            update: {
                name: loc.name,
                county: loc.county,
                subCounty: loc.subCounty,
                ward: loc.ward,
                latitude: loc.latitude,
                longitude: loc.longitude,
                population: loc.population,
                areaKm2: loc.areaKm2,
                isUrban: loc.isUrban,
            },
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
            population: 408000,
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
            population: 180000,
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
            population: 661885,
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
            population: 925775,
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
            population: 175000,
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
            population: 371111,
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
            population: 24530,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9770, -1.4510], [36.9880, -1.4510],
                    [36.9880, -1.4590], [36.9770, -1.4590], [36.9770, -1.4510],
                ]],
            },
        },
        {
            id: "fz-njiru",
            name: "Njiru Flood Zone",
            code: "NBI-FZ-007",
            locationId: "loc-njiru",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 32,
            riverProximityKm: 0.4,
            elevationM: 1540,
            historicalFloodScore: 72,
            population: 626482,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9770, -1.2470], [36.9920, -1.2470],
                    [36.9920, -1.2570], [36.9770, -1.2570], [36.9770, -1.2470],
                ]],
            },
        },
        {
            id: "fz-ruai",
            name: "Ruai Lowlands Flood Zone",
            code: "NBI-FZ-008",
            locationId: "loc-ruai",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 35,
            riverProximityKm: 0.3,
            elevationM: 1532,
            historicalFloodScore: 70,
            population: 72134,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9980, -1.2400], [37.0130, -1.2400],
                    [37.0130, -1.2510], [36.9980, -1.2510], [36.9980, -1.2400],
                ]],
            },
        },
        {
            id: "fz-dandora",
            name: "Dandora Flood Zone",
            code: "NBI-FZ-009",
            locationId: "loc-dandora",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 24,
            riverProximityKm: 0.2,
            elevationM: 1594,
            historicalFloodScore: 76,
            population: 150000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8920, -1.2350], [36.9050, -1.2350],
                    [36.9050, -1.2450], [36.8920, -1.2450], [36.8920, -1.2350],
                ]],
            },
        },
        {
            id: "fz-kiambiu",
            name: "Kiambiu-Eastleigh Flood Zone",
            code: "NBI-FZ-010",
            locationId: "loc-kiambiu",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 26,
            riverProximityKm: 0.3,
            elevationM: 1610,
            historicalFloodScore: 74,
            population: 45000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8570, -1.2630], [36.8670, -1.2630],
                    [36.8670, -1.2720], [36.8570, -1.2720], [36.8570, -1.2630],
                ]],
            },
        },
        {
            id: "fz-githogoro",
            name: "Githogoro Flood Zone",
            code: "NBI-FZ-011",
            locationId: "loc-githogoro",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 38,
            riverProximityKm: 0.2,
            elevationM: 1678,
            historicalFloodScore: 58,
            population: 20000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8080, -1.2260], [36.8170, -1.2260],
                    [36.8170, -1.2340], [36.8080, -1.2340], [36.8080, -1.2260],
                ]],
            },
        },
        {
            id: "fz-kangemi",
            name: "Kangemi-Waititi Flood Zone",
            code: "NBI-FZ-012",
            locationId: "loc-kangemi",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 28,
            riverProximityKm: 0.2,
            elevationM: 1672,
            historicalFloodScore: 68,
            population: 100000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.7390, -1.2640], [36.7510, -1.2640],
                    [36.7510, -1.2730], [36.7390, -1.2730], [36.7390, -1.2640],
                ]],
            },
        },
        {
            id: "fz-waruku",
            name: "Waruku River Corridor Flood Zone",
            code: "NBI-FZ-013",
            locationId: "loc-waruku",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 34,
            riverProximityKm: 0.1,
            elevationM: 1658,
            historicalFloodScore: 62,
            population: 15000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.7660, -1.2670], [36.7760, -1.2670],
                    [36.7760, -1.2760], [36.7660, -1.2760], [36.7660, -1.2670],
                ]],
            },
        },
        {
            id: "fz-parklands",
            name: "Westlands-Parklands Flood Zone",
            code: "NBI-FZ-020",
            locationId: "loc-parklands",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 31,
            riverProximityKm: 0.4,
            elevationM: 1684,
            historicalFloodScore: 69,
            population: 85000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8040, -1.2490], [36.8230, -1.2490],
                    [36.8230, -1.2620], [36.8040, -1.2620], [36.8040, -1.2490],
                ]],
            },
        },
        {
            id: "fz-gikomba",
            name: "Gikomba Riverbank Flood Zone",
            code: "NBI-FZ-014",
            locationId: "loc-gikomba",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 30,
            riverProximityKm: 0.1,
            elevationM: 1620,
            historicalFloodScore: 71,
            population: 25000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8460, -1.2810], [36.8550, -1.2810],
                    [36.8550, -1.2890], [36.8460, -1.2890], [36.8460, -1.2810],
                ]],
            },
        },
        {
            id: "fz-highrise",
            name: "South C-Highrise Flood Zone",
            code: "NBI-FZ-015",
            locationId: "loc-highrise",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 37,
            riverProximityKm: 0.5,
            elevationM: 1654,
            historicalFloodScore: 57,
            population: 50000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.7990, -1.3040], [36.8100, -1.3040],
                    [36.8100, -1.3130], [36.7990, -1.3130], [36.7990, -1.3040],
                ]],
            },
        },
        {
            id: "fz-maziwa",
            name: "Maziwa-Zimmerman Flood Zone",
            code: "NBI-FZ-016",
            locationId: "loc-maziwa",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 41,
            riverProximityKm: 0.6,
            elevationM: 1605,
            historicalFloodScore: 53,
            population: 49533,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.8780, -1.2140], [36.8890, -1.2140],
                    [36.8890, -1.2230], [36.8780, -1.2230], [36.8780, -1.2140],
                ]],
            },
        },
        {
            id: "fz-kahawa",
            name: "Kahawa-Githurai Flood Zone",
            code: "NBI-FZ-017",
            locationId: "loc-kahawa-west",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 39,
            riverProximityKm: 0.5,
            elevationM: 1564,
            historicalFloodScore: 56,
            population: 100000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9280, -1.1780], [36.9420, -1.1780],
                    [36.9420, -1.1900], [36.9280, -1.1900], [36.9280, -1.1780],
                ]],
            },
        },
        {
            id: "fz-donholm",
            name: "Donholm-Umoja-Chokaa Flood Zone",
            code: "NBI-FZ-018",
            locationId: "loc-donholm",
            organizationId: redCrossOrg.id,
            riskLevel: "HIGH" as const,
            drainageScore: 33,
            riverProximityKm: 0.4,
            elevationM: 1616,
            historicalFloodScore: 66,
            population: 150000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9060, -1.2790], [36.9220, -1.2790],
                    [36.9220, -1.2890], [36.9060, -1.2890], [36.9060, -1.2790],
                ]],
            },
        },
        {
            id: "fz-utawala",
            name: "Utawala-Mihango Flood Zone",
            code: "NBI-FZ-019",
            locationId: "loc-utawala",
            organizationId: redCrossOrg.id,
            riskLevel: "MEDIUM" as const,
            drainageScore: 43,
            riverProximityKm: 0.7,
            elevationM: 1602,
            historicalFloodScore: 52,
            population: 50000,
            polygonCoordinates: {
                type: "Polygon",
                coordinates: [[
                    [36.9490, -1.2790], [36.9650, -1.2790],
                    [36.9650, -1.2910], [36.9490, -1.2910], [36.9490, -1.2790],
                ]],
            },
        },
    ];

    for (const zone of floodZones) {
        await prisma.floodZone.upsert({
            where: { id: zone.id },
            update: {
                name: zone.name,
                code: zone.code,
                locationId: zone.locationId,
                organizationId: zone.organizationId,
                riskLevel: zone.riskLevel,
                drainageScore: zone.drainageScore,
                riverProximityKm: zone.riverProximityKm,
                elevationM: zone.elevationM,
                historicalFloodScore: zone.historicalFloodScore,
                population: zone.population,
                polygonCoordinates: zone.polygonCoordinates as Parameters<typeof prisma.floodZone.update>[0]["data"]["polygonCoordinates"],
                isActive: true,
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
        update: {
            apiKey: process.env.TOMORROW_API_KEY || "",
            baseUrl: "https://api.tomorrow.io/v4",
            isActive: true,
            isPrimary: true,
            timeoutMs: 8000,
            maxRetries: 2,
        },
        create: {
            id: "wp-tomorrow",
            provider: "TOMORROW_IO",
            apiKey: process.env.TOMORROW_API_KEY || "",
            baseUrl: "https://api.tomorrow.io/v4",
            isActive: true,
            isPrimary: true,
            timeoutMs: 8000,
            maxRetries: 2,
        },
    });

    await prisma.weatherProviderConfig.upsert({
        where: { id: "wp-openweather" },
        update: {
            apiKey: process.env.OPENWEATHER_API_KEY || "",
            baseUrl: "https://api.openweathermap.org/data/2.5",
            isActive: true,
            isPrimary: false,
            timeoutMs: 8000,
            maxRetries: 2,
        },
        create: {
            id: "wp-openweather",
            provider: "OPENWEATHER",
            apiKey: process.env.OPENWEATHER_API_KEY || "",
            baseUrl: "https://api.openweathermap.org/data/2.5",
            isActive: true,
            isPrimary: false,
            timeoutMs: 8000,
            maxRetries: 2,
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
    console.log("   admin@floodguard.ke     → ADMIN            (Pass@123#)");
    console.log("   coordinator@redcross.ke → DISASTER_MANAGER (Pass@123#)");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });



