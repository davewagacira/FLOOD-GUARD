import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const zone = await prisma.floodZone.findFirst({
        where: { name: { contains: 'Kibera' } }
    });

    if (zone) {
        await prisma.floodZone.update({
            where: { id: zone.id },
            data: { riskLevel: 'CRITICAL' }
        });
        console.log(`Updated ${zone.name} to CRITICAL risk level!`);
    } else {
        // Just pick the first one and make it critical
        const first = await prisma.floodZone.findFirst();
        if (first) {
            await prisma.floodZone.update({
                where: { id: first.id },
                data: { riskLevel: 'CRITICAL' }
            });
            console.log(`Updated ${first.name} to CRITICAL risk level!`);
        } else {
            console.log('No flood zones found.');
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
