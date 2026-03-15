'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminDashboardSkeleton } from '@/components/ui/skeleton-loaders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, CheckCircle2, Clock, MessageSquare, Users, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';

interface AlertItem {
  id: string;
  title: string;
  riskLevel: string;
  status: string;
  recipientCount: number;
  sentAt: string | null;
  scheduledAt?: string | null;
  location: { name: string } | null;
  organization: { name: string };
}

interface BroadcastResponse {
  sent: AlertItem[];
  scheduled: AlertItem[];
  deliveryByZone: Array<{ region: string; sent: number; delivered: number; failed: number; rate: number }>;
}

function timeAgo(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 0) return `in ${Math.ceil(Math.abs(diff) / 60000)}m`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  return `${hours}h ago`;
}

export default function BroadcastsPage() {
  const [data, setData] = useState<BroadcastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const response = await fetch('/api/sms/broadcasts', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load broadcasts');
    setData(payload);
  };

  useEffect(() => {
    loadData()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load broadcasts'))
      .finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      loadData().catch(() => undefined);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <AdminDashboardSkeleton />;

  const sent = data?.sent ?? [];
  const scheduled = data?.scheduled ?? [];
  const deliveryByZone = data?.deliveryByZone ?? [];
  const deliveredTotal = deliveryByZone.reduce((sum, item) => sum + item.delivered, 0);
  const failedTotal = deliveryByZone.reduce((sum, item) => sum + item.failed, 0);
  const sentTotal = deliveryByZone.reduce((sum, item) => sum + item.sent, 0);

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Broadcasts</h1>
          <p className="text-slate-400">Live SMS broadcast history, queue status, and zone-level delivery performance.</p>
        </div>
        <LiveBadge label="Live Data" />
      </HeaderMotion>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-2">Queued Alerts</p>
            <p className="text-3xl font-bold text-white">{scheduled.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-2">Outbound Messages</p>
            <p className="text-3xl font-bold text-white">{sentTotal}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-2">Delivered</p>
            <p className="text-3xl font-bold text-green-400">{deliveredTotal}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-2">Failed</p>
            <p className="text-3xl font-bold text-red-400">{failedTotal}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8 border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Delivery by Zone</CardTitle>
          <CardDescription className="text-slate-400">Last 7 days of outbound SMS by flood zone.</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveryByZone.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
              No delivery activity yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deliveryByZone}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="region" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="delivered" stackId="delivery" fill="#10b981" />
                <Bar dataKey="failed" stackId="delivery" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="queued" className="gap-6">
        <TabsList className="mx-auto h-auto w-fit justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
          <TabsTrigger value="queued" className="flex-0 rounded-xl px-4 py-2 data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-200">
            <Clock className="h-4 w-4" /> Queued & Approved ({scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-0 rounded-xl px-4 py-2 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-200">
            <BarChart3 className="h-4 w-4" /> Sent Broadcasts ({sent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queued">
          {scheduled.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6 text-slate-400">No queued broadcasts right now.</div>
          ) : (
            <div className="space-y-3">
              {scheduled.map((broadcast) => (
                <Card key={broadcast.id} className="border-orange-500/20 bg-slate-900/50">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold text-white">{broadcast.title}</p>
                      <p className="text-sm text-slate-400">
                        {broadcast.organization.name} • {broadcast.location?.name ?? 'All Zones'} • {broadcast.recipientCount} recipients
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="mb-2 border border-orange-500/30 bg-orange-500/15 text-orange-300">{broadcast.status.replace('_', ' ')}</Badge>
                      <p className="text-xs text-slate-500">{timeAgo(broadcast.scheduledAt ?? null)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sent.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-8 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-slate-400">No broadcasts sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sent.map((broadcast) => (
                <Card key={broadcast.id} className="border-slate-800 bg-slate-900/50">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-semibold text-white">{broadcast.title}</p>
                        <Badge className="border border-slate-700 bg-slate-800/80 text-slate-200">{broadcast.riskLevel}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{broadcast.recipientCount}</span>
                        <span>{broadcast.organization.name}</span>
                        <span>{broadcast.location?.name ?? 'All Zones'}</span>
                        <span>{timeAgo(broadcast.sentAt)}</span>
                      </div>
                    </div>
                    <Badge className={`${broadcast.status === 'SENT' ? 'bg-green-500/15 text-green-300 border-green-500/30' : broadcast.status === 'SENDING' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'} border`}>
                      {broadcast.status === 'SENT' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : broadcast.status === 'SENDING' ? <MessageSquare className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                      {broadcast.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

