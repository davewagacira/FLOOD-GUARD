import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
    try {
        await prisma.$connect();
        console.log("✅ Prisma connected to Neon OK");
        const count = await prisma.organization.count();
        console.log(`Organizations in DB: ${count}`);
        await prisma.$disconnect();
    } catch (e) {
        console.error("❌ Error:", e);
        process.exit(1);
    }
}

test();
