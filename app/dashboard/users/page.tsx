'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Mail, Users, Loader2 } from 'lucide-react';
import { HeaderMotion, LiveBadge, ListItem } from '@/components/ui/motion';
import { TablePageSkeleton } from '@/components/ui/skeleton-loaders';

interface User { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt: string | null; createdAt: string; organization: { name: string; type: string }; }

const roleColors: Record<string, string> = {
  ADMIN: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  DISASTER_MANAGER: 'bg-red-500/10 text-red-400 border-red-500/30',
  TELCO_OPERATOR: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

function timeAgo(date: string | null): string {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <TablePageSkeleton />;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Users</h1>
          <p className="text-slate-400">Platform users authenticated against Neon database</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge label="Live Data" />
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <Plus className="w-4 h-4 mr-2" />Add User
          </Button>
        </div>
      </HeaderMotion>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  {['Name', 'Email', 'Organization', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-slate-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No users found</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4"><p className="font-medium text-white">{user.name}</p></td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><Mail className="w-4 h-4" />{user.email}</div></td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.organization.name}</td>
                    <td className="px-6 py-4"><Badge className={`${roleColors[user.role] ?? 'bg-slate-500/10 text-slate-400'} border`}>{user.role.replace('_', ' ')}</Badge></td>
                    <td className="px-6 py-4"><Badge className={user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-6 py-4 text-sm text-slate-400">{timeAgo(user.lastLoginAt)}</td>
                    <td className="px-6 py-4"><button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"><Edit2 className="w-4 h-4" /></button></td>
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

