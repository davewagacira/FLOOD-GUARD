/**
 * FloodGuard - Update Organization Logos
 * Run: npx tsx scripts/update-logos.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log("Updating organization logos...");

    const safaricom = await prisma.organization.updateMany({
        where: { name: { contains: "Safaricom", mode: "insensitive" } },
        data: { logoUrl: "https://qbeuqgtblostqyuvaxbg.supabase.co/storage/v1/object/public/images/public/safaricom-logo.jpg" }
    });

    const redcross = await prisma.organization.updateMany({
        where: { name: { contains: "Red Cross", mode: "insensitive" } },
        data: { logoUrl: "https://qbeuqgtblostqyuvaxbg.supabase.co/storage/v1/object/public/images/public/red-cross-logo.jpg" }
    });

    console.log(`Updated Safaricom orgs: ${safaricom.count}`);
    console.log(`Updated Red Cross orgs: ${redcross.count}`);
    console.log("Done");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
