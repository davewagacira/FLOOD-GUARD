'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Database, MessageSquare, Cloud, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HeaderMotion, LiveBadge, ScaleCard, PageMotion } from '@/components/ui/motion';
import { AdminDashboardSkeleton } from '@/components/ui/skeleton-loaders';

interface HealthCheck { id: string; service: string; status: string; message: string | null; responseMs: number | null; checkedAt: string; }
interface SmsStats { status: string; _count: number; }
interface HealthData { healthChecks: HealthCheck[]; smsStats: SmsStats[]; }

const serviceIcon: Record<string, React.ReactNode> = {
  database: <Database className="w-5 h-5" />,
  sms_gateway: <MessageSquare className="w-5 h-5" />,
  openweather_api: <Cloud className="w-5 h-5" />,
  tomorrow_io_api: <Cloud className="w-5 h-5" />,
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = () => fetch('/api/system-health').then(r => r.json()).then((d) => { setData(d); setLastRefresh(new Date()); });

  useEffect(() => {
    loadData().finally(() => setIsLoading(false));
    const i = setInterval(loadData, 60000);
    return () => clearInterval(i);
  }, []);

  if (isLoading && !data) return <AdminDashboardSkeleton />;

  const checks = data?.healthChecks ?? [];
  const smsStats = data?.smsStats ?? [];

  const allUp = checks.every(c => c.status === 'UP');
  const anyDown = checks.some(c => c.status === 'DOWN');

  const uptimeChartData = checks.map(c => ({
    service: c.service.replace('_', ' '),
    responseMs: c.responseMs ?? 0,
  }));

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">System Health</h1>
          <p className="text-slate-400">Live platform infrastructure status — Neon DB, Weather APIs, SMS Gateway</p>
        </div>
        <div className="flex items-center gap-3">
          {allUp && <LiveBadge label="All Systems Operational" />}
          {anyDown && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400 font-medium">Degraded</span>
            </div>
          )}
          <button onClick={loadData} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </HeaderMotion>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
      ) : (
        <>
          {/* Service Status Cards */}
          <PageMotion className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {checks.map((check, i) => (
              <ScaleCard key={check.id} delay={i * 0.06}>
                <Card className={`border backdrop-blur ${check.status === 'UP' ? 'border-green-500/20 bg-green-500/5' : check.status === 'DOWN' ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2 rounded-lg ${check.status === 'UP' ? 'bg-green-500/10 text-green-400' : check.status === 'DOWN' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {serviceIcon[check.service] ?? <Server className="w-5 h-5" />}
                      </div>
                      <Badge className={check.status === 'UP' ? 'bg-green-500/20 text-green-400' : check.status === 'DOWN' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}>
                        {check.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-300 mb-2 capitalize">{check.service.replace(/_/g, ' ')}</p>
                    <div className="space-y-1">
                      {check.responseMs && <div className="flex justify-between text-xs"><span className="text-slate-400">Response</span><span className="text-white font-semibold">{check.responseMs}ms</span></div>}
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Checked</span><span className="text-white">{timeAgo(check.checkedAt)}</span></div>
                      {check.message && <p className="text-xs text-slate-500 mt-2 truncate">{check.message}</p>}
                    </div>
                  </CardContent>
                </Card>
              </ScaleCard>
            ))}
          </PageMotion>

          {/* Response Time Chart */}
          {uptimeChartData.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur mb-8">
              <CardHeader>
                <CardTitle className="text-white">Service Response Times</CardTitle>
                <CardDescription className="text-slate-400">Latest measured latency per service (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={uptimeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="service" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} formatter={(v) => [`${v}ms`, 'Response Time']} />
                    <Line type="monotone" dataKey="responseMs" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* SMS Stats */}
          {smsStats.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">SMS Gateway Statistics</CardTitle>
                <CardDescription className="text-slate-400">All-time message status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {smsStats.map(stat => (
                    <div key={stat.status} className="bg-slate-800/30 p-4 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">{stat.status.replace('_', ' ')}</p>
                      <p className="text-2xl font-bold text-white">{stat._count}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-600 mt-6 text-right">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
        </>
      )}
    </div>
  );
}

