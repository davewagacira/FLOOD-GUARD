'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, MapPin, Users, Building2, Loader2 } from 'lucide-react';
import { HeaderMotion, LiveBadge, ListItem, PageMotion } from '@/components/ui/motion';
import { TablePageSkeleton } from '@/components/ui/skeleton-loaders';

interface Org { id: string; name: string; type: string; isActive: boolean; contactEmail: string; createdAt: string; description: string | null; _count: { users: number; floodZones: number }; }

const typeColors: Record<string, string> = {
  ADMIN: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  DISASTER_MANAGEMENT: 'bg-red-500/10 text-red-400 border-red-500/30',
  TELCO: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  NGO: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/organizations').then(r => r.json()).then(setOrgs).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <TablePageSkeleton />;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Organizations</h1>
          <p className="text-slate-400">Partner organizations registered in the platform</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <LiveBadge label="Live Data" />
          <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />New Organization
          </Button>
        </div>
      </HeaderMotion>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          <div className="md:hidden space-y-3 p-4">
            {orgs.length === 0 ? (
              <div className="rounded-lg border border-slate-800/50 bg-slate-900/30 px-4 py-10 text-center text-slate-500">
                No organizations found
              </div>
            ) : orgs.map((org) => (
              <div key={org.id} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 shrink-0 text-slate-500" />
                      <p className="truncate font-medium text-white">{org.name}</p>
                    </div>
                    {org.description && <p className="mt-1 text-xs text-slate-500">{org.description}</p>}
                  </div>
                  <button className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className={`${typeColors[org.type] ?? 'bg-slate-500/10 text-slate-400'} border`}>
                    {org.type.replace('_', ' ')}
                  </Badge>
                  <Badge className={org.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                    {org.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-800/40 p-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-4 h-4" />
                      <span>{org._count.floodZones} zones</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-800/40 p-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4" />
                      <span>{org._count.users} users</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="break-all text-slate-400">{org.contactEmail}</p>
                  <p className="text-slate-500">Joined {new Date(org.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  {['Organization', 'Type', 'Status', 'Flood Zones', 'Users', 'Email', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-slate-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No organizations found</td></tr>
                ) : orgs.map((org) => (
                  <tr key={org.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="font-medium text-white">{org.name}</p>
                          {org.description && <p className="text-xs text-slate-500 mt-0.5">{org.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge className={`${typeColors[org.type] ?? 'bg-slate-500/10 text-slate-400'} border`}>{org.type.replace('_', ' ')}</Badge></td>
                    <td className="px-6 py-4"><Badge className={org.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>{org.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4" />{org._count.floodZones}</div></td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-300"><Users className="w-4 h-4" />{org._count.users}</div></td>
                    <td className="px-6 py-4 text-sm text-slate-400">{org.contactEmail}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(org.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

