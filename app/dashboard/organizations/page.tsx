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
      <HeaderMotion className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Organizations</h1>
          <p className="text-slate-400">Partner organizations registered in the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge label="Live Data" />
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
            <Plus className="w-4 h-4 mr-2" />New Organization
          </Button>
        </div>
      </HeaderMotion>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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

