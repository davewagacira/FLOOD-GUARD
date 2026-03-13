import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.user.updateMany({
        where: { name: 'Safaricom Operator' },
        data: { name: 'Safaricom' },
    });
    console.log('Renamed Safaricom in DB');
}

main().catch(console.error).finally(() => prisma.$disconnect());
