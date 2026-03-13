// GET /api/users — real users from Neon DB
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: { organization: { select: { name: true, type: true } } },
        omit: { hashedPassword: true },
    });
    return NextResponse.json(users);
}
