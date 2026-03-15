'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TablePageSkeleton } from '@/components/ui/skeleton-loaders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, Eye, Loader2, MessageSquare, Send, XCircle } from 'lucide-react';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';

interface AlertRecord {
  id: string;
  title: string;
  message: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  recipientCount: number;
  createdAt: string;
  sentAt: string | null;
  approvedAt: string | null;
  location: { name: string; county: string } | null;
  organization: { name: string };
}

const riskStyle: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

function timeAgo(value: string | null) {
  if (!value) return 'Not yet';
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  return `${hours}h ago`;
}

export default function AlertApprovalsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);

  const fetchAlerts = async () => {
    const response = await fetch('/api/alerts', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load alerts');
    }
    setAlerts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchAlerts()
      .catch((error) => setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load alerts' }))
      .finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      fetchAlerts().catch(() => undefined);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(alerts.filter((alert) => alert.status === 'PENDING_APPROVAL').length / 12));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [alerts, page]);

  const updateStatus = async (alertId: string, status: 'APPROVED' | 'CANCELLED') => {
    setBusyId(alertId);
    setNotice(null);

    try {
      const response = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update alert');

      await fetchAlerts();
      setNotice({
        type: 'success',
        text: status === 'APPROVED' ? 'Alert approved and ready for broadcast.' : 'Alert cancelled successfully.',
      });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update alert' });
    } finally {
      setBusyId(null);
    }
  };

  const approveAndSend = async (alertId: string) => {
    setBusyId(alertId);
    setNotice(null);

    try {
      const approveResponse = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const approveData = await approveResponse.json();
      if (!approveResponse.ok) throw new Error(approveData.error || 'Failed to approve alert');

      const triggerResponse = await fetch(`/api/alerts/${alertId}/trigger`, { method: 'POST' });
      const triggerData = await triggerResponse.json();
      if (!triggerResponse.ok) throw new Error(triggerData.error || 'Failed to trigger broadcast');

      await fetchAlerts();
      setNotice({
        type: 'success',
        text: `Broadcast started. Sent ${triggerData.sent ?? 0} and failed ${triggerData.failed ?? 0}.`,
      });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send alert' });
    } finally {
      setBusyId(null);
    }
  };

  const sendApproved = async (alertId: string) => {
    setBusyId(alertId);
    setNotice(null);

    try {
      const response = await fetch(`/api/alerts/${alertId}/trigger`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to trigger broadcast');

      await fetchAlerts();
      setNotice({
        type: 'success',
        text: `Broadcast started. Sent ${data.sent ?? 0} and failed ${data.failed ?? 0}.`,
      });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send alert' });
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <TablePageSkeleton rows={6} />;

  const pending = alerts.filter((alert) => alert.status === 'PENDING_APPROVAL');
  const approved = alerts.filter((alert) => alert.status === 'APPROVED');
  const recent = alerts.filter((alert) => ['SENDING', 'SENT', 'CANCELLED'].includes(alert.status)).slice(0, 8);
  const totalPages = Math.max(1, Math.ceil(pending.length / 12));
  const visiblePending = pending.slice((page - 1) * 12, page * 12);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Alert Approvals</h1>
          <p className="text-slate-400">Approve, reject, and launch live SMS broadcasts from active alerts.</p>
        </div>
        <LiveBadge label="Live Queue" />
      </HeaderMotion>

      {notice && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {notice.text}
        </div>
      )}

      <Tabs defaultValue="pending" className="gap-6">
        <TabsList className="mx-auto h-auto w-fit justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
          <TabsTrigger value="pending" className="flex-0 rounded-xl px-4 py-2 data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-200">
            <Clock className="h-4 w-4" /> Pending Review ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-0 rounded-xl px-4 py-2 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-200">
            <MessageSquare className="h-4 w-4" /> Approved Queue ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-0 rounded-xl px-4 py-2 data-[state=active]:bg-green-500/15 data-[state=active]:text-green-200">
            <CheckCircle2 className="h-4 w-4" /> Recent Outcomes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-400" />
              <p className="text-slate-300">No alerts are waiting for approval.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visiblePending.map((alert) => (
                  <Card key={alert.id} className="border-orange-500/25 bg-slate-900/60">
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
                            <Badge className={`${riskStyle[alert.riskLevel]} border`}>{alert.riskLevel}</Badge>
                          </div>
                          <p className="text-sm text-slate-400">
                            {alert.organization.name} • {alert.location?.name ?? 'All Zones'} • Created {timeAgo(alert.createdAt)}
                          </p>
                        </div>
                        <Badge className="bg-orange-500/15 text-orange-300 border border-orange-500/30">{alert.status.replace('_', ' ')}</Badge>
                      </div>

                      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                        <p className="text-sm font-mono leading-relaxed text-slate-200">{alert.message}</p>
                      </div>

                      <div className="mb-5 grid gap-3 rounded-lg bg-slate-800/30 p-4 md:grid-cols-3">
                        <div>
                          <p className="mb-1 text-xs text-slate-400">Recipients</p>
                          <p className="text-lg font-semibold text-white">{alert.recipientCount || 0}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-slate-400">County</p>
                          <p className="text-lg font-semibold text-white">{alert.location?.county ?? 'Platform-wide'}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-slate-400">Alert ID</p>
                          <p className="truncate font-mono text-sm text-slate-300">{alert.id}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="border-slate-700 hover:bg-slate-800"
                          disabled
                        >
                          <Eye className="mr-2 h-4 w-4" />Reviewed Live
                        </Button>
                        <Button
                          variant="outline"
                          className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                          onClick={() => updateStatus(alert.id, 'APPROVED')}
                          disabled={busyId !== null}
                        >
                          {busyId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Approve Only
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                          onClick={() => updateStatus(alert.id, 'CANCELLED')}
                          disabled={busyId !== null}
                        >
                          <XCircle className="mr-2 h-4 w-4" />Reject
                        </Button>
                        <Button
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => approveAndSend(alert.id)}
                          disabled={busyId !== null}
                        >
                          {busyId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Approve & Send
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <p className="text-sm text-slate-400">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-slate-700 hover:bg-slate-800"
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 hover:bg-slate-800"
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approved.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6 text-slate-400">
              Approved alerts waiting for send will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {approved.map((alert) => (
                <Card key={alert.id} className="border-slate-800 bg-slate-900/50">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold text-white">{alert.title}</p>
                      <p className="text-sm text-slate-400">
                        {alert.location?.name ?? 'All Zones'} • Approved {timeAgo(alert.approvedAt)} • {alert.recipientCount} recipients
                      </p>
                    </div>
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => sendApproved(alert.id)} disabled={busyId !== null}>
                      {busyId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <div className="space-y-3">
            {recent.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6 text-slate-400">No recent alert outcomes yet.</div>
            ) : (
              recent.map((alert) => (
                <Card key={alert.id} className="border-slate-800 bg-slate-900/50">
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold text-white">{alert.title}</p>
                      <p className="text-sm text-slate-400">
                        {alert.organization.name} • {alert.location?.name ?? 'All Zones'} • {timeAgo(alert.sentAt ?? alert.createdAt)}
                      </p>
                    </div>
                    <Badge className={`${alert.status === 'SENT' ? 'bg-green-500/15 text-green-300 border-green-500/30' : alert.status === 'SENDING' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'} border`}>
                      {alert.status.replace('_', ' ')}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

