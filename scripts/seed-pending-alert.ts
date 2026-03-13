import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding pending alert...");

    const kibera = await prisma.floodZone.findFirst({
        where: { name: { contains: 'Kibera', mode: 'insensitive' } },
        include: { location: true },
    });

    const org = await prisma.organization.findFirst({
        where: { type: 'DISASTER_MANAGEMENT' },
    });

    if (!kibera || !org) {
        console.log("Could not find Kibera zone or Disaster Management org");
        return;
    }

    await prisma.alert.create({
        data: {
            title: "Kibera Flood Alert - High Rainfall",
            message: "Heavy rainfall is expected near Kibera starting around 5:00 PM. Flooding may occur in low-lying areas.\n\nReply 1 if you need help\nReply 2 if you are safe",
            riskLevel: "CRITICAL",
            status: "PENDING_APPROVAL",
            organizationId: org.id,
            locationId: kibera.locationId,
            recipientCount: 2, // From earlier seeding
        }
    });

    console.log("Seeded pending alert.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
