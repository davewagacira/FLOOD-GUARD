import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
    adapter: new PrismaPg(pool as any) as any,
} as any);

async function main() {
    const preferredNumbers = ["254112228206", "254703100790"];

    const zones = await prisma.floodZone.findMany({
        where: {
            name: {
                in: ["Kibera", "Mathare"],
            },
        },
        orderBy: { name: "asc" },
    });

    if (zones.length < 2) {
        throw new Error("Expected to find Kibera and Mathare flood zones.");
    }

    await prisma.smsRecipient.deleteMany({
        where: {
            phoneNumber: {
                notIn: preferredNumbers,
            },
        },
    });

    await prisma.smsRecipient.createMany({
        data: [
            {
                phoneNumber: preferredNumbers[0],
                locationId: zones.find((zone) => zone.name === "Mathare")!.locationId,
                zoneId: zones.find((zone) => zone.name === "Mathare")!.id,
            },
            {
                phoneNumber: preferredNumbers[1],
                locationId: zones.find((zone) => zone.name === "Kibera")!.locationId,
                zoneId: zones.find((zone) => zone.name === "Kibera")!.id,
            },
        ],
        skipDuplicates: true,
    });

    console.log("Cleaned SmsRecipient table and kept only the approved two numbers.");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
