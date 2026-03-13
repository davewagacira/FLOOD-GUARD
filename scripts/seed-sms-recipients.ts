import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding sms recipients...");

    // Find Kibera and Mathare zones
    const kibera = await prisma.floodZone.findUnique({
        where: { code: 'NBI-FZ-001' }, // Assume kibera is 001, wait! We need to query by name
    });

    const mathare = await prisma.floodZone.findFirst({
        where: { name: { contains: 'Mathare', mode: 'insensitive' } },
    });

    const kiberaReal = kibera || await prisma.floodZone.findFirst({
        where: { name: { contains: 'Kibera', mode: 'insensitive' } },
    });

    if (!kiberaReal || !mathare) {
        console.log("Could not find Kibera or Mathare zones");
        return;
    }

    await prisma.smsRecipient.createMany({
        data: [
            {
                phoneNumber: "254703100790",
                zoneId: kiberaReal.id,
                locationId: kiberaReal.locationId,
            },
            {
                phoneNumber: "254112228206",
                zoneId: mathare.id,
                locationId: mathare.locationId,
            }
        ],
        skipDuplicates: true,
    });

    console.log("Seeded SMS recipients.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
