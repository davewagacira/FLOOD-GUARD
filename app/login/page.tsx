import { prisma } from '@/lib/db/prisma';

import { LoginClientPage } from './login-client-page';

async function getActiveZonesCount() {
  try {
    return await prisma.floodZone.count({ where: { isActive: true } });
  } catch {
    return null;
  }
}

export default async function LoginPage() {
  const activeZonesCount = await getActiveZonesCount();

  return <LoginClientPage activeZonesCount={activeZonesCount} />;
}
