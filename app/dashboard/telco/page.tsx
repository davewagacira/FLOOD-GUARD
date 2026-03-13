'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare, CheckCircle2, AlertTriangle,
  Clock, XCircle, Send, Play, X, Calendar, Activity, Database
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
  };
  pendingAlerts: Array<{
    id: string; title: string; riskLevel: string; status: string;
    recipientCount: number; createdAt: string; message: string;
    location: { name: string; county: string } | null;
    organization: { name: string };
  }>;
  recentBroadcasts: Array<{
    id: string; title: string; status: string; recipientCount: number;
    sentAt: string | null; location: { name: string } | null;
  }>;
  incomingReplies: Array<{
    id: string; phoneNumber: string; message: string;
    status: string; createdAt: string;
  }>;
}

const riskColors: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-green-500/10 text-green-400 border-green-500/30',
};

export default function TelcoDashboard() {
  const [data, setData] = useState<TelcoMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionating, setActionating] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard/telco');
      if (res.ok) setData(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  const triggerBroadcast = async (alertId: string) => {
    setActionating(alertId);
    try {
      await fetch(`/api/alerts/${alertId}/trigger`, { method: 'POST' });
      await fetchData();
    } finally {
      setActionating(null);
    }
  };

  const cancelAlert = async (alertId: string) => {
    setActionating(alertId);
    try {
      await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      await fetchData();
    } finally {
      setActionating(null);
    }
  };

  if (isLoading) {
    return <TelcoDashboardSkeleton />;
  }

  if (!data) return <TelcoDashboardSkeleton />;

  const { metrics, pendingAlerts, recentBroadcasts, incomingReplies } = data;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <HeaderMotion className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Monitor live SMS operations, pending broadcasts, and field responses in one place.</p>
        </div>
        <LiveBadge label="Gateway Active" className="bg-green-500/10 border-green-500/20 text-green-400" />
      </HeaderMotion>

      {/* Overview Stats (SMS Delivery Monitor) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Messages Sent', value: metrics.smsSentToday, icon: <Send className="w-5 h-5" />, color: 'blue' },
          { label: 'Delivered', value: metrics.smsDeliveredToday, icon: <CheckCircle2 className="w-5 h-5" />, color: 'green' },
          { label: 'Failed', value: metrics.smsFailedToday, icon: <XCircle className="w-5 h-5" />, color: 'red' },
          { label: 'Pending Approvals', value: metrics.pendingApprovalsCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'orange' },
        ].map((s, idx) => (
          <div key={idx} className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:bg-slate-800/50 transition-colors">
            <div className={`text-${s.color}-400 mb-3`}>{s.icon}</div>
            <p className="text-3xl font-bold text-white mb-1">{s.value.toLocaleString()}</p>
            <p className="text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Column: Broadcasts & Approvals */}
        <div className="lg:col-span-2 space-y-8">

          {/* 1. Broadcast Alerts */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="border-b border-slate-800/60 flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-white text-lg">Broadcast Alerts</CardTitle>
                <CardDescription className="text-slate-400">Pending alerts waiting for telco blast trigger</CardDescription>
              </div>
              <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                {pendingAlerts.length} Pending
              </Badge>
            </CardHeader>
            <CardContent className="pt-6">
              {pendingAlerts.length === 0 ? (
                <div className="text-center py-8 border border-slate-800 border-dashed rounded-lg bg-slate-900/20">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-400">No alerts pending broadcast.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAlerts.map(alert => (
                    <div key={alert.id} className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 mt-0.5 ${alert.riskLevel === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}`} />
                          <div>
                            <p className="font-semibold text-white">{alert.title}</p>
                            <p className="text-sm text-slate-400 mt-1">
                              Location: <span className="text-slate-300 font-medium">{alert.location?.name || 'All Zones'}</span> •
                              Severity: <span className="text-slate-300 font-medium">{alert.riskLevel}</span>
                            </p>
                          </div>
                        </div>
                        <Badge className={`${riskColors[alert.riskLevel]} border px-2.5 py-1 text-xs`}>
                          {alert.status}
                        </Badge>
                      </div>
                      <div className="bg-slate-950/50 rounded-lg p-3 mb-4 border border-slate-800">
                        <p className="text-sm text-slate-300 font-mono">"{alert.message || 'Flood risk alert...'}"</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(alert.createdAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Est. Recipients: {alert.recipientCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => cancelAlert(alert.id)}
                            disabled={actionating !== null}
                            className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button
                            disabled={actionating !== null}
                            className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/30 disabled:opacity-50"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Schedule
                          </button>
                          <button
                            onClick={() => triggerBroadcast(alert.id)}
                            disabled={actionating !== null}
                            className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {actionating === alert.id ? 'Triggering...' : 'Trigger Broadcast'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Message Logs */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Message Dispatch Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {recentBroadcasts.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No recent broadcasts found.</p>
              ) : (
                <div className="space-y-3">
                  {recentBroadcasts.map(msg => (
                    <div key={msg.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40">
                      <div>
                        <p className="text-sm font-semibold text-white">{msg.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Location: {msg.location?.name || 'General'} | Recipients: {msg.recipientCount}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <Badge className={`px-2 py-0 border text-[10px] ${msg.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                          msg.status === 'SENDING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
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

        {/* Right Column: Health & Responses */}
        <div className="space-y-8">

          {/* 4. Gateway Health */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                API Gateway Health
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-white">Safaricom Secure API</p>
                  <p className="text-xs text-slate-500">Primary gateway</p>
                </div>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30">ONLINE</Badge>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Delivery Success Rate</p>
                  <p className="text-sm font-bold text-white">{metrics.deliveryRate}%</p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-green-400 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, metrics.deliveryRate))}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800 border-dashed">
                <p className="text-xs text-slate-500">Last SMS Dispatched</p>
                <p className="text-sm font-mono text-slate-300">
                  {recentBroadcasts[0]?.sentAt ? new Date(recentBroadcasts[0].sentAt).toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Citizen Responses */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Live Citizen Responses
              </CardTitle>
              <CardDescription className="text-slate-400">Incoming text replies from the field</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {incomingReplies.length === 0 ? (
                <p className="text-slate-500 text-sm italic text-center py-4">Waiting for responses...</p>
              ) : (
                <div className="space-y-4">
                  {incomingReplies.slice(0, 10).map(reply => {
                    const isHelp = reply.message.trim() === '1' || reply.message.toLowerCase().includes('help');
                    const isSafe = reply.message.trim() === '2' || reply.message.toLowerCase().includes('safe');
                    return (
                      <div key={reply.id} className="relative pl-4 border-l-2" style={{ borderColor: isHelp ? '#ef4444' : isSafe ? '#22c55e' : '#64748b' }}>
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-mono text-slate-200">
                            {reply.phoneNumber.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 ✖✖✖ ✖✖✖')}
                          </p>
                          <span className="text-[10px] text-slate-500">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded inline-block ${isHelp ? 'bg-red-500/10 text-red-400' :
                          isSafe ? 'bg-green-500/10 text-green-400' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                          "{reply.message}"
                        </div>
                        {isHelp && <Badge className="absolute right-0 bottom-0 bg-red-500/10 text-red-400 border-red-500/20 text-[9px] px-1.5">DISTRESS</Badge>}
                      </div>
                    )
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
