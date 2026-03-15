'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminDashboardSkeleton } from '@/components/ui/skeleton-loaders';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // Redirect to role-specific dashboard
    if (user.role === 'admin' || (user.role as string) === 'ADMIN') {
      router.push('/dashboard/admin');
    } else if (
      user.role === 'ngo' ||
      (user.role as string) === 'DISASTER_MANAGER' ||
      (user.role as string) === 'TELCO_OPERATOR'
    ) {
      router.push('/dashboard/ngo');
    }
  }, [user, router]);

  return <AdminDashboardSkeleton />;
}
