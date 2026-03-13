'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Cloud, MapPin, Phone, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeaderMotion, LiveBadge, PageMotion, ScaleCard } from '@/components/ui/motion';
import { AdminDashboardSkeleton } from '@/components/ui/skeleton-loaders';

interface NgoMetrics {
  metrics: {
    activeIncidents: number;
    distressSignals24h: number;
    unresolvedDistress: number;
    deployedTeams: number;
    highRiskZones: number;
  };
  incidentSeverityChart: Array<{ name: string; count: number }>;
  recentIncidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    affectedCount: number | null;
    createdAt: string;
    _count: { distressSignals: number };
  }>;
  recentDistress: Array<{
    id: string;
    phoneNumber: string;
    rawMessage: string;
    signalType: string;
    status: string;
    createdAt: string;
    location: { name: string } | null;
  }>;
  floodZoneRisks: Array<{
    id: string;
    name: string;
    riskLevel: string;
    population: number | null;
    location: { name: string; county: string };
    assessments: Array<{ riskScore: number; assessedAt: string }>;
  }>;
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const riskColors: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-green-400',
};

const distressColors: Record<string, string> = {
  NEED_HELP: 'bg-red-500/20 text-red-400',
  SAFE: 'bg-green-500/20 text-green-400',
  FREE_TEXT: 'bg-blue-500/20 text-blue-400',
};

export default function NGODashboard() {
  const [data, setData] = useState<NgoMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard/ngo', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(response.status === 401 || response.status === 403 ? 'You do not have access to disaster dashboard metrics.' : 'Failed to fetch disaster dashboard metrics.');
        }
        const payload = await response.json();
        setData(payload);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <AdminDashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <p className="text-slate-400">{error ?? 'Failed to load dashboard data.'}</p>
        </div>
      </div>
    );
  }

  const { metrics, incidentSeverityChart, recentIncidents, recentDistress, floodZoneRisks } = data;

  const metricsData = [
    {
      label: 'Active Incidents',
      value: metrics.activeIncidents,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'red' as const,
      description: 'Requiring response',
    },
    {
      label: 'Distress Signals',
      value: metrics.distressSignals24h,
      icon: <Phone className="h-5 w-5" />,
      color: 'orange' as const,
      description: 'Last 24 hours',
    },
    {
      label: 'Deployed Teams',
      value: metrics.deployedTeams,
      icon: <Users className="h-5 w-5" />,
      color: 'blue' as const,
      description: 'Active operations',
    },
    {
      label: 'High Risk Zones',
      value: metrics.highRiskZones,
      icon: <MapPin className="h-5 w-5" />,
      color: 'green' as const,
      description: 'Critical and high',
    },
  ];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-white">Disaster Management Dashboard</h1>
          <p className="text-slate-400">Live flood intelligence, incident coordination, and field response monitoring for disaster operations.</p>
        </div>
        <LiveBadge label="Live" />
      </HeaderMotion>

      {metrics.unresolvedDistress > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <p className="font-medium text-red-300">
            {metrics.unresolvedDistress} unresolved NEED HELP signal{metrics.unresolvedDistress !== 1 ? 's' : ''} - immediate attention required
          </p>
        </div>
      )}

      <PageMotion className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricsData.map((metric, index) => (
          <ScaleCard key={metric.label} delay={index * 0.05}>
            <MetricCard {...metric} />
          </ScaleCard>
        ))}
      </PageMotion>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Incident Severity</CardTitle>
            <CardDescription className="text-slate-400">Current severity distribution across open incidents.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={incidentSeverityChart.length > 0 ? incidentSeverityChart : [{ name: 'No Data', count: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} labelStyle={{ color: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Cloud className="h-5 w-5 text-blue-400" />
              Flood Zone Risk Levels
            </CardTitle>
            <CardDescription className="text-slate-400">Latest flood-zone risk scores from the live weather pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {floodZoneRisks.length === 0 ? (
                <p className="text-sm text-slate-500">No flood-zone risk data is available yet.</p>
              ) : (
                floodZoneRisks.slice(0, 8).map((zone) => {
                  const latestScore = zone.assessments[0]?.riskScore;
                  return (
                    <div key={zone.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                      <div>
                        <p className="text-sm font-medium text-white">{zone.name}</p>
                        <p className="text-xs text-slate-400">{zone.location.county}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${riskColors[zone.riskLevel]}`}>{zone.riskLevel}</p>
                        {latestScore !== undefined && <p className="text-xs text-slate-500">Score: {latestScore.toFixed(1)}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Active Incidents</CardTitle>
            <CardDescription className="text-slate-400">Latest incident records shared with admin operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500">No active incidents</p>
                  <p className="mt-1 text-xs text-slate-600">Incident records will appear here as they are created.</p>
                </div>
              ) : (
                recentIncidents.map((incident) => (
                  <div key={incident.id} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:border-slate-600">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">{incident.title}</p>
                        {incident.affectedCount && <p className="mt-1 text-xs text-slate-400">{incident.affectedCount.toLocaleString()} people affected</p>}
                      </div>
                      <Badge className={`${severityColors[incident.severity]} border text-xs`}>{incident.severity}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{incident.status.replace('_', ' ')}</span>
                      <span className="text-slate-500">{incident._count.distressSignals} signals - {new Date(incident.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Distress Signals</CardTitle>
            <CardDescription className="text-slate-400">Latest citizen SMS responses coming in through the alerting channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDistress.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500">No distress signals yet</p>
                  <p className="mt-1 text-xs text-slate-600">Citizen responses will appear here as incoming SMS is processed.</p>
                </div>
              ) : (
                recentDistress.slice(0, 6).map((signal) => (
                  <div key={signal.id} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:border-slate-600">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">{signal.location?.name || signal.phoneNumber}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">{signal.rawMessage}</p>
                      </div>
                      <div className={`rounded px-2 py-1 text-xs font-semibold ${distressColors[signal.signalType]}`}>
                        {signal.signalType.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{signal.status.replace('_', ' ')}</span>
                      <span className="text-slate-500">{new Date(signal.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
