import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.smsRecipient.findMany().then(console.log).finally(() => prisma.$disconnect());
