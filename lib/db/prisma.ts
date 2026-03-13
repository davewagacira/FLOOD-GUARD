// Prisma Client Singleton — uses @prisma/adapter-pg for Prisma v7
// Prisma v7 removed the Rust engine; a driver adapter is required

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;

// Singleton pool + client to prevent multiple connections in dev hot-reload
const globalForPrisma = globalThis as unknown as {
    pool: Pool | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma: any | undefined;
};

const pool: Pool =
    globalForPrisma.pool ??
    new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);

export const prisma: PrismaClient =
    globalForPrisma.prisma ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
    globalForPrisma.prisma = prisma;
}
