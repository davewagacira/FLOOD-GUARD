'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminDashboardSkeleton } from '@/components/ui/skeleton-loaders';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, MessageSquare } from 'lucide-react';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';

interface HealthCheck {
  id: string;
  service: string;
  status: string;
  message: string | null;
  responseMs: number | null;
  checkedAt: string;
}

interface SmsStat {
  status: string;
  _count: number;
}

interface RecentMessage {
  id: string;
  phoneNumber: string;
  status: string;
  message: string;
  providerId: string | null;
  errorMsg: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
  locationName: string;
  alertTitle: string | null;
}

interface DeliveryReportsPayload {
  healthChecks: HealthCheck[];
  smsStats: SmsStat[];
  dailyVolume: Array<{ day: string; sent: number; delivered: number; failed: number }>;
  recentMessages: RecentMessage[];
}

function getHealthCheckLabel(service: string) {
  switch (service) {
    case 'sms_gateway':
      return 'Red Cross SMS API';
    case 'database':
      return 'Secure Messaging Database';
    default:
      return service.replace(/_/g, ' ');
  }
}

function getHealthCheckMessage(healthCheck: HealthCheck) {
  if (healthCheck.service === 'sms_gateway') {
    return 'Red Cross SMS API connected';
  }
  return healthCheck.message ?? 'No additional message';
}

function formatPhone(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length !== 12) return phoneNumber;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`;
}

export default function DeliveryReportsPage() {
  const [data, setData] = useState<DeliveryReportsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    const response = await fetch('/api/sms/delivery-reports', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load delivery reports');
    setData(payload);
  };

  useEffect(() => {
    loadReports()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load delivery reports'))
      .finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      loadReports().catch(() => undefined);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const smsStats = data?.smsStats ?? [];
  const totalOutbound = smsStats.reduce((sum, item) => sum + item._count, 0);
  const delivered = smsStats.find((item) => item.status === 'DELIVERED')?._count ?? 0;
  const failed = smsStats.find((item) => item.status === 'FAILED')?._count ?? 0;
  const sent = smsStats.find((item) => item.status === 'SENT')?._count ?? 0;
  const deliveryRate = totalOutbound > 0 ? ((delivered / totalOutbound) * 100).toFixed(1) : '0.0';

  const exportRows = useMemo(() => {
    return (data?.recentMessages ?? []).map((message) => ({
      phoneNumber: message.phoneNumber,
      status: message.status,
      locationName: message.locationName,
      alertTitle: message.alertTitle ?? '',
      providerId: message.providerId ?? '',
      sentAt: message.sentAt ?? '',
      deliveredAt: message.deliveredAt ?? '',
      failedAt: message.failedAt ?? '',
      error: message.errorMsg ?? '',
    }));
  }, [data?.recentMessages]);

  const exportCsv = () => {
    const headers = ['phoneNumber', 'status', 'locationName', 'alertTitle', 'providerId', 'sentAt', 'deliveredAt', 'failedAt', 'error'];
    const csv = [
      headers.join(','),
      ...exportRows.map((row) => headers.map((header) => `"${String(row[header as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delivery-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <AdminDashboardSkeleton />;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Delivery Reports</h1>
          <p className="text-slate-400">Per-message delivery tracking, service health, and exportable SMS delivery audit data.</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge label="Live" />
          <Button className="border border-slate-700 bg-slate-800 text-white hover:bg-slate-700" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        </div>
      </HeaderMotion>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-5"><p className="text-xs text-slate-400 mb-2">Total Outbound</p><p className="text-3xl font-bold text-white">{totalOutbound}</p></CardContent></Card>
        <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-5"><p className="text-xs text-slate-400 mb-2">Delivered</p><p className="text-3xl font-bold text-green-400">{delivered}</p></CardContent></Card>
        <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-5"><p className="text-xs text-slate-400 mb-2">Failed</p><p className="text-3xl font-bold text-red-400">{failed}</p></CardContent></Card>
        <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-5"><p className="text-xs text-slate-400 mb-2">Delivery Rate</p><p className="text-3xl font-bold text-blue-300">{deliveryRate}%</p><p className="mt-1 text-xs text-slate-500">{sent} still pending provider confirmation</p></CardContent></Card>
      </div>

      <Card className="mb-8 border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Daily Delivery Trend</CardTitle>
          <CardDescription className="text-slate-400">Outbound, delivered, and failed counts over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.dailyVolume?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="sent" fill="#38bdf8" />
                <Bar dataKey="delivered" fill="#10b981" />
                <Bar dataKey="failed" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">No SMS activity yet.</div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Recent Message-Level Reports</CardTitle>
          <CardDescription className="text-slate-400">Latest outbound messages with provider and delivery details.</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.recentMessages?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-3 text-left">Phone</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-left">Alert</th>
                    <th className="px-3 py-3 text-left">Zone</th>
                    <th className="px-3 py-3 text-left">Provider ID</th>
                    <th className="px-3 py-3 text-left">Event Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMessages.map((message) => (
                    <tr key={message.id} className="border-b border-slate-800/60 text-slate-200">
                      <td className="px-3 py-3 font-mono">{formatPhone(message.phoneNumber)}</td>
                      <td className="px-3 py-3">
                        <Badge className={`${message.status === 'DELIVERED' ? 'bg-green-500/15 text-green-300 border-green-500/30' : message.status === 'FAILED' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30'} border`}>
                          {message.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-white">{message.alertTitle ?? 'Manual send'}</p>
                        <p className="mt-1 max-w-md truncate text-xs text-slate-500">{message.message}</p>
                        {message.errorMsg && <p className="mt-1 text-xs text-red-300">{message.errorMsg}</p>}
                      </td>
                      <td className="px-3 py-3 text-slate-300">{message.locationName}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-400">{message.providerId ?? 'Pending'}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {new Date(message.deliveredAt ?? message.failedAt ?? message.sentAt ?? message.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              No recent outbound SMS records found.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Service Health Checks</CardTitle>
          <CardDescription className="text-slate-400">Latest messaging platform service checks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.healthChecks ?? []).map((healthCheck) => (
              <div key={healthCheck.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div>
                  <p className="font-medium text-white">{getHealthCheckLabel(healthCheck.service)}</p>
                  <p className="text-xs text-slate-500">{getHealthCheckMessage(healthCheck)}</p>
                </div>
                <div className="text-right">
                  <Badge className={`${healthCheck.status === 'UP' ? 'bg-green-500/15 text-green-300 border-green-500/30' : healthCheck.status === 'DEGRADED' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'} border`}>
                    {healthCheck.status}
                  </Badge>
                  <p className="mt-1 text-xs text-slate-500">{healthCheck.responseMs ?? 0}ms</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




