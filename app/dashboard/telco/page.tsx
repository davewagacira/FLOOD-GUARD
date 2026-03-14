'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Send,
  Play,
  X,
  Calendar,
  Activity,
  Database,
} from 'lucide-react';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';
import { TelcoDashboardSkeleton } from '@/components/ui/skeleton-loaders';

interface TelcoMetrics {
  metrics: {
    smsSentToday: number;
    smsDeliveredToday: number;
    smsFailedToday: number;
    deliveryRate: number;
    pendingApprovalsCount: number;
    readyForBroadcastCount: number;
  };
  pendingAlerts: Array<{
    id: string;
    title: string;
    riskLevel: string;
    status: string;
    recipientCount: number;
    createdAt: string;
    approvedAt?: string | null;
    message: string;
    location: { name: string; county: string } | null;
    organization: { name: string };
  }>;
  recentBroadcasts: Array<{
    id: string;
    title: string;
    status: string;
    recipientCount: number;
    sentAt: string | null;
    location: { name: string } | null;
  }>;
  incomingReplies: Array<{
    id: string;
    phoneNumber: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
}

const riskColors: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const statusColors: Record<string, string> = {
  PENDING_APPROVAL: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  SENDING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  SENT: 'bg-green-500/10 text-green-400 border-green-500/30',
  CANCELLED: 'bg-slate-800 text-slate-400 border-slate-700',
};

export default function TelcoDashboard() {
  const [data, setData] = useState<TelcoMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionating, setActionating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (background = false) => {
    if (background) {
      setIsRefreshing(true);
    }

    try {
      const res = await fetch('/api/dashboard/telco', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to fetch telco dashboard data');
      }

      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch telco dashboard data');
    } finally {
      setIsLoading(false);
      if (background) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true).catch(() => undefined);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const triggerBroadcast = async (alertId: string) => {
    setActionating(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}/trigger`, { method: 'POST' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to trigger broadcast');
      }

      await fetchData(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger broadcast');
    } finally {
      setActionating(null);
    }
  };

  const cancelAlert = async (alertId: string) => {
    setActionating(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to cancel alert');
      }

      await fetchData(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel alert');
    } finally {
      setActionating(null);
    }
  };

  if (isLoading) {
    return <TelcoDashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
          {error ?? 'Telco dashboard data is currently unavailable.'}
        </div>
      </div>
    );
  }

  const { metrics, pendingAlerts, recentBroadcasts, incomingReplies } = data;
  const queueCount = metrics.readyForBroadcastCount + metrics.pendingApprovalsCount;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Monitor live SMS operations, queued broadcasts, and field responses in one place.</p>
        </div>
        <LiveBadge
          label={isRefreshing ? 'Refreshing Live Data' : 'Gateway Active'}
          className="border-green-500/20 bg-green-500/10 text-green-400"
        />
      </HeaderMotion>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        {[
          { label: 'Messages Sent Today', value: metrics.smsSentToday, icon: <Send className="h-5 w-5" />, color: 'blue' },
          { label: 'Delivered Today', value: metrics.smsDeliveredToday, icon: <CheckCircle2 className="h-5 w-5" />, color: 'green' },
          { label: 'Failed Today', value: metrics.smsFailedToday, icon: <XCircle className="h-5 w-5" />, color: 'red' },
          { label: 'Queued Broadcasts', value: queueCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'orange' },
        ].map((stat, index) => (
          <div key={index} className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 transition-colors hover:bg-slate-800/50">
            <div className={`mb-3 text-${stat.color}-400`}>{stat.icon}</div>
            <p className="mb-1 text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
            <p className="text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Broadcast Queue</CardTitle>
                <CardDescription className="text-slate-400">
                  Approved alerts are ready to trigger. Pending approvals still require admin action first.
                </CardDescription>
              </div>
              <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400">
                {metrics.readyForBroadcastCount} Ready
              </Badge>
            </CardHeader>
            <CardContent className="pt-6">
              {pendingAlerts.length === 0 ? (
                <div className="rounded-lg border border-slate-800 border-dashed bg-slate-900/20 py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-400" />
                  <p className="text-slate-400">No alerts are currently queued for telco operations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAlerts.map((alert) => {
                    const canTrigger = alert.status === 'APPROVED';
                    return (
                      <div key={alert.id} className="group rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 transition-all hover:border-slate-600/60">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`mt-0.5 h-5 w-5 ${alert.riskLevel === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}`} />
                            <div>
                              <p className="font-semibold text-white">{alert.title}</p>
                              <p className="mt-1 text-sm text-slate-400">
                                Location: <span className="font-medium text-slate-300">{alert.location?.name || 'All Zones'}</span> | Severity:{' '}
                                <span className="font-medium text-slate-300">{alert.riskLevel}</span>
                              </p>
                            </div>
                          </div>
                          <Badge className={`${statusColors[alert.status] ?? 'bg-slate-800 text-slate-400 border-slate-700'} border px-2.5 py-1 text-xs`}>
                            {alert.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                          <p className="font-mono text-sm text-slate-300">"{alert.message || 'Flood risk alert...'}"</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(alert.createdAt).toLocaleString()}
                            </span>
                            {alert.approvedAt && (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approved {new Date(alert.approvedAt).toLocaleString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Est. Recipients: {alert.recipientCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => cancelAlert(alert.id)}
                              disabled={actionating !== null}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
                            >
                              <span className="flex items-center gap-1.5">
                                <X className="h-3.5 w-3.5" /> Cancel
                              </span>
                            </button>
                            <button
                              disabled
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors disabled:opacity-50"
                            >
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" /> Schedule
                              </span>
                            </button>
                            <button
                              onClick={() => triggerBroadcast(alert.id)}
                              disabled={actionating !== null || !canTrigger}
                              className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-green-500/20 transition-colors hover:bg-green-600 disabled:opacity-50"
                            >
                              <span className="flex items-center gap-1.5">
                                <Play className="h-3.5 w-3.5 fill-current" />
                                {!canTrigger ? 'Awaiting Approval' : actionating === alert.id ? 'Triggering...' : 'Trigger Broadcast'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Database className="h-5 w-5 text-blue-400" />
                Message Dispatch Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {recentBroadcasts.length === 0 ? (
                <p className="text-sm italic text-slate-500">No recent broadcasts found.</p>
              ) : (
                <div className="space-y-3">
                  {recentBroadcasts.map((msg) => (
                    <div key={msg.id} className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/20 p-3 hover:bg-slate-800/40">
                      <div>
                        <p className="text-sm font-semibold text-white">{msg.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Location: {msg.location?.name || 'General'} | Recipients: {msg.recipientCount}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <Badge
                          className={`border px-2 py-0 text-[10px] ${
                            msg.status === 'SENT'
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : msg.status === 'SENDING'
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                : 'border-slate-700 bg-slate-800 text-slate-400'
                          }`}
                        >
                          {msg.status}
                        </Badge>
                        <span className="text-[11px] text-slate-500">{msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Activity className="h-5 w-5 text-green-400" />
                API Gateway Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Safaricom Secure API</p>
                  <p className="text-xs text-slate-500">Primary gateway</p>
                </div>
                <Badge className="border-green-500/30 bg-green-500/10 text-green-400">ONLINE</Badge>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Delivery Success Rate</p>
                  <p className="text-sm font-bold text-white">{metrics.deliveryRate}%</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800">
                  <div
                    className="h-1.5 rounded-full bg-green-400 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, metrics.deliveryRate))}%` }}
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 border-dashed pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Ready for Broadcast</p>
                  <p className="text-sm font-semibold text-blue-300">{metrics.readyForBroadcastCount}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Pending Approvals</p>
                  <p className="text-sm font-semibold text-yellow-300">{metrics.pendingApprovalsCount}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Last SMS Dispatched</p>
                  <p className="text-sm font-mono text-slate-300">
                    {recentBroadcasts[0]?.sentAt ? new Date(recentBroadcasts[0].sentAt).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                Live Citizen Responses
              </CardTitle>
              <CardDescription className="text-slate-400">Incoming text replies from the field</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {incomingReplies.length === 0 ? (
                <p className="py-4 text-center text-sm italic text-slate-500">Waiting for responses...</p>
              ) : (
                <div className="space-y-4">
                  {incomingReplies.slice(0, 10).map((reply) => {
                    const lowerMessage = reply.message.toLowerCase();
                    const isHelp = reply.message.trim() === '1' || lowerMessage.includes('help');
                    const isSafe = reply.message.trim() === '2' || lowerMessage.includes('safe');

                    return (
                      <div
                        key={reply.id}
                        className="relative border-l-2 pl-4"
                        style={{ borderColor: isHelp ? '#ef4444' : isSafe ? '#22c55e' : '#64748b' }}
                      >
                        <div className="mb-1 flex items-start justify-between">
                          <p className="text-sm font-mono text-slate-200">
                            {reply.phoneNumber.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 *** ***')}
                          </p>
                          <span className="text-[10px] text-slate-500">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div
                          className={`inline-block rounded px-2 py-1 text-xs ${
                            isHelp
                              ? 'bg-red-500/10 text-red-400'
                              : isSafe
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          "{reply.message}"
                        </div>
                        {isHelp && (
                          <Badge className="absolute bottom-0 right-0 border-red-500/20 bg-red-500/10 px-1.5 text-[9px] text-red-400">
                            DISTRESS
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
