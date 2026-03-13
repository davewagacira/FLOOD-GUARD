'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Building2, Users, MapPin, Activity, AlertTriangle, MessageSquare, ShieldAlert, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { PageMotion, FadeUp, ScaleCard, HeaderMotion, LiveBadge, ListItem } from '@/components/ui/motion';
import { AdminDashboardSkeleton } from '@/components/ui/skeleton-loaders';

interface AdminMetrics {
  metrics: {
    totalOrgs: number;
    totalUsers: number;
    activeFloodZones: number;
    highRiskZones: number;
    activeAlerts: number;
    smsSentToday: number;
    smsSentThisWeek: number;
  };
  recentAuditLogs: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    createdAt: string;
    user: { name: string; email: string } | null;
  }>;
  latestHealthChecks: Array<{
    id: string;
    service: string;
    status: 'UP' | 'DEGRADED' | 'DOWN';
    responseMs: number | null;
    message: string | null;
    checkedAt: string;
  }>;
  charts: {
    orgGrowth: Array<{ name: string; organizations: number }>;
    smsDailyVolume: Array<{ date: string; count: number }>;
  };
}

const healthColors = {
  UP: 'text-green-400 bg-green-500/10',
  DEGRADED: 'text-yellow-400 bg-yellow-500/10',
  DOWN: 'text-red-400 bg-red-500/10',
};

const healthDot = {
  UP: 'bg-green-400',
  DEGRADED: 'bg-yellow-400',
  DOWN: 'bg-red-400',
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/admin');
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-400">Failed to load dashboard data.</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { metrics, recentAuditLogs, latestHealthChecks, charts } = data;

  const metricsData = [
    { label: 'Organizations', value: metrics.totalOrgs, icon: <Building2 className="w-5 h-5" />, color: 'orange' as const, description: 'Active orgs' },
    { label: 'Active Alerts', value: metrics.activeAlerts, icon: <AlertTriangle className="w-5 h-5" />, color: 'blue' as const, description: 'Ongoing emergencies' },
    { label: 'High Risk Zones', value: metrics.highRiskZones, icon: <ShieldAlert className="w-5 h-5" />, color: 'red' as const, description: `of ${metrics.activeFloodZones} zones` },
    { label: 'SMS This Week', value: metrics.smsSentThisWeek.toLocaleString(), icon: <MessageSquare className="w-5 h-5" />, color: 'green' as const, description: `${metrics.smsSentToday.toLocaleString()} today` },
  ];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <HeaderMotion className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Administrator Dashboard</h1>
          <p className="text-slate-400">Infrastructure & System Management</p>
        </div>
        <LiveBadge label="Live Data" />
      </HeaderMotion>

      {/* Metrics Grid */}
      <PageMotion className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricsData.map((metric, idx) => (
          <ScaleCard key={idx} delay={idx * 0.05}>
            <MetricCard {...metric} />
          </ScaleCard>
        ))}
      </PageMotion>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Organization Growth */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Organization Growth</CardTitle>
            <CardDescription className="text-slate-400">Last 6 months from DB</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.orgGrowth.length > 0 ? charts.orgGrowth : [{ name: 'Now', organizations: metrics.totalOrgs }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="organizations" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily SMS Volume */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Daily SMS Volume</CardTitle>
            <CardDescription className="text-slate-400">Last 7 days outbound</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={charts.smsDailyVolume.length > 0 ? charts.smsDailyVolume : [{ date: 'Today', count: metrics.smsSentToday }]}>
                <defs>
                  <linearGradient id="colorSms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="url(#colorSms)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              System Health
            </CardTitle>
            <CardDescription className="text-slate-400">Live service status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestHealthChecks.length === 0 ? (
                <p className="text-slate-500 text-sm">No health checks yet</p>
              ) : (
                latestHealthChecks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${healthDot[check.status]}`} />
                      <div>
                        <p className="text-sm font-medium text-white capitalize">
                          {check.service.replace(/_/g, ' ')}
                        </p>
                        {check.message && <p className="text-xs text-slate-500">{check.message}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${healthColors[check.status]} border-0 text-xs`}>
                        {check.status}
                      </Badge>
                      {check.responseMs && (
                        <p className="text-xs text-slate-500 mt-1">{check.responseMs}ms</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Recent Audit Logs</CardTitle>
            <CardDescription className="text-slate-400">Latest system activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAuditLogs.length === 0 ? (
                <p className="text-slate-500 text-sm">No audit logs yet</p>
              ) : (
                recentAuditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div className="p-1.5 rounded bg-blue-500/10 mt-0.5">
                      <TrendingUp className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {log.user?.name || 'System'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.action} on {log.resource}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
              {recentAuditLogs.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-500 text-sm">Audit logs will appear as users take actions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts Summary */}
      {metrics.activeAlerts > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/5 backdrop-blur">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <p className="text-orange-300 font-medium">
                {metrics.activeAlerts} active alert{metrics.activeAlerts !== 1 ? 's' : ''} currently in the system
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
