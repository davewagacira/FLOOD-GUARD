/**
 * FloodGuard — Update DB users to final values (all pass: Pass@123#)
 * Run: npx tsx scripts/update-users.ts
 */

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
    console.log("🔧 Updating FloodGuard users (password: Pass@123#)...\n");

    const pass = await bcrypt.hash("Pass@123#", 10);

    // ── 1. Admin (us) ─────────────────────────────────────────────────────────
    const admin = await prisma.user.upsert({
        where: { email: "admin@floodguard.ke" },
        update: {
            name: "Admin",
            hashedPassword: pass,
            isActive: true,
        },
        create: {
            email: "admin@floodguard.ke",
            name: "Admin",
            hashedPassword: pass,
            role: "ADMIN",
            organizationId: "org-floodguard",
            isActive: true,
        },
    });
    console.log(`✅ Admin:     ${admin.email}  →  ${admin.name}`);

    // ── 2. Safaricom (Telco) ──────────────────────────────────────────────────
    const safaricom = await prisma.user.upsert({
        where: { email: "operator@safaricom.ke" },
        update: {
            name: "Safaricom",
            hashedPassword: pass,
            isActive: true,
        },
        create: {
            email: "operator@safaricom.ke",
            name: "Safaricom",
            hashedPassword: pass,
            role: "TELCO_OPERATOR",
            organizationId: "org-safaricom",
            isActive: true,
        },
    });
    console.log(`✅ Safaricom: ${safaricom.email}  →  ${safaricom.name}`);

    // ── 3. Red Cross (Disaster Manager) ───────────────────────────────────────
    const redcross = await prisma.user.upsert({
        where: { email: "coordinator@redcross.ke" },
        update: {
            name: "Red Cross Coordinator",
            hashedPassword: pass,
            isActive: true,
        },
        create: {
            email: "coordinator@redcross.ke",
            name: "Red Cross Coordinator",
            hashedPassword: pass,
            role: "DISASTER_MANAGER",
            organizationId: "org-redcross",
            isActive: true,
        },
    });
    console.log(`✅ Red Cross: ${redcross.email}  →  ${redcross.name}`);

    // ── Remove any extra users ─────────────────────────────────────────────────
    const keepers = [admin.id, safaricom.id, redcross.id];
    const deleted = await prisma.user.deleteMany({
        where: { id: { notIn: keepers } },
    });
    if (deleted.count > 0) console.log(`🗑️  Removed ${deleted.count} extra user(s)`);

    console.log("\n📋 Login credentials (all use password: Pass@123#)");
    console.log("   admin@floodguard.ke      →  ADMIN            (Pass@123#)");
    console.log("   operator@safaricom.ke    →  TELCO_OPERATOR   (Pass@123#)");
    console.log("   coordinator@redcross.ke  →  DISASTER_MANAGER (Pass@123#)");
    console.log("\n✅ Done!");
}

main()
    .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); await pool.end(); });

