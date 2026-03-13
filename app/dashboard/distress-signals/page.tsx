'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, Phone, PlusCircle, RadioTower } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';
import { CardGridSkeleton } from '@/components/ui/skeleton-loaders';

type SignalType = 'NEED_HELP' | 'SAFE' | 'FREE_TEXT';
type SignalStatus = 'RECEIVED' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED';

interface Signal {
  id: string;
  phoneNumber: string;
  rawMessage: string;
  signalType: SignalType;
  status: SignalStatus;
  createdAt: string;
  location: { id: string; name: string; county: string } | null;
  incident: { id: string; title: string; status: string; severity: string } | null;
}

const typeStyle: Record<SignalType, string> = {
  NEED_HELP: 'border-red-500/30 bg-red-500/5',
  SAFE: 'border-green-500/30 bg-green-500/5',
  FREE_TEXT: 'border-blue-500/30 bg-blue-500/5',
};

const typeBadge: Record<SignalType, string> = {
  NEED_HELP: 'bg-red-500/20 text-red-400',
  SAFE: 'bg-green-500/20 text-green-400',
  FREE_TEXT: 'bg-blue-500/20 text-blue-400',
};

const statusBadge: Record<SignalStatus, string> = {
  RECEIVED: 'bg-yellow-500/20 text-yellow-400',
  ACKNOWLEDGED: 'bg-blue-500/20 text-blue-400',
  ASSIGNED: 'bg-orange-500/20 text-orange-400',
  RESOLVED: 'bg-green-500/20 text-green-400',
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DistressSignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadSignals = useCallback(async () => {
    try {
      const response = await fetch('/api/distress-signals', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(response.status === 401 || response.status === 403 ? 'You do not have access to distress operations.' : 'Failed to load distress signals.');
      }
      const data = await response.json() as Signal[];
      setSignals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load distress signals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignals();
    const interval = setInterval(loadSignals, 15000);
    return () => clearInterval(interval);
  }, [loadSignals]);

  const handleSignalAction = useCallback(async (signalId: string, payload: Record<string, unknown>) => {
    setActingId(signalId);
    try {
      const response = await fetch(`/api/distress-signals/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to update distress signal.');
      }
      setSignals((current) => current.map((signal) => signal.id === signalId ? data : signal));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update distress signal.');
    } finally {
      setActingId(null);
    }
  }, []);

  const urgentSignals = useMemo(() => signals.filter((signal) => signal.signalType === 'NEED_HELP' && signal.status === 'RECEIVED'), [signals]);
  const unresolvedSignals = useMemo(() => signals.filter((signal) => signal.status !== 'RESOLVED').length, [signals]);
  const linkedIncidents = useMemo(() => signals.filter((signal) => signal.incident).length, [signals]);

  if (isLoading) return <CardGridSkeleton cards={4} />;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-white">Distress Signals</h1>
          <p className="text-slate-400">Review live citizen SMS responses, escalate urgent cases into incidents, and keep response status current.</p>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge label="Live" />
          {urgentSignals.length > 0 && (
            <Badge className="bg-red-500/20 px-3 py-1 text-sm text-red-400">
              <AlertTriangle className="mr-1 h-4 w-4" />{urgentSignals.length} urgent
            </Badge>
          )}
        </div>
      </HeaderMotion>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[
          { label: 'Unresolved Signals', value: unresolvedSignals, icon: <RadioTower className="h-4 w-4" />, color: 'text-orange-400' },
          { label: 'Urgent NEED HELP', value: urgentSignals.length, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-400' },
          { label: 'Signals Linked To Incidents', value: linkedIncidents, icon: <PlusCircle className="h-4 w-4" />, color: 'text-blue-400' },
        ].map((metric) => (
          <Card key={metric.label} className="border-slate-800 bg-slate-900/55 backdrop-blur">
            <CardContent className="flex items-center gap-3 p-5">
              <div className={metric.color}>{metric.icon}</div>
              <div>
                <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                <p className="text-xs text-slate-500">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {signals.length === 0 ? (
        <div className="py-20 text-center">
          <Phone className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">No distress signals yet</p>
          <p className="mt-2 text-sm text-slate-500">Citizen replies will appear here as soon as SMS webhook traffic arrives.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => {
            const isActing = actingId === signal.id;
            return (
              <Card key={signal.id} className={`border backdrop-blur ${typeStyle[signal.signalType]}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                    <div className={`rounded-lg p-2 ${signal.signalType === 'SAFE' ? 'bg-green-500/10 text-green-400' : signal.signalType === 'NEED_HELP' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {signal.signalType === 'SAFE' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>

                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <p className="font-mono font-semibold text-white">{signal.phoneNumber}</p>
                        <Badge className={`${typeBadge[signal.signalType]} text-xs`}>{signal.signalType.replace('_', ' ')}</Badge>
                        <Badge className={`${statusBadge[signal.status]} text-xs`}>{signal.status}</Badge>
                      </div>

                      <p className="mb-3 inline-block rounded bg-slate-800/30 px-3 py-1 font-mono text-sm text-slate-300">"{signal.rawMessage}"</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        {signal.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{signal.location.name}, {signal.location.county}</span>}
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{timeAgo(signal.createdAt)}</span>
                      </div>

                      {signal.incident && (
                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Linked Incident</p>
                          <p className="mt-1 text-sm font-medium text-white">{signal.incident.title}</p>
                          <p className="text-xs text-slate-400">{signal.incident.severity} - {signal.incident.status.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 xl:w-52">
                      {signal.status === 'RECEIVED' && (
                        <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-600" onClick={() => handleSignalAction(signal.id, { status: 'ACKNOWLEDGED', note: 'Signal acknowledged by disaster operations.' })} disabled={isActing}>
                          {isActing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Acknowledge
                        </Button>
                      )}

                      {signal.signalType === 'NEED_HELP' && !signal.incident && (
                        <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => handleSignalAction(signal.id, { status: 'ASSIGNED', createIncident: true, note: 'Incident created from distress signal.' })} disabled={isActing}>
                          {isActing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                          Create Incident
                        </Button>
                      )}

                      {signal.status !== 'RESOLVED' && (
                        <Button variant="outline" size="sm" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800" onClick={() => handleSignalAction(signal.id, { status: 'RESOLVED', note: 'Signal resolved by disaster operations.' })} disabled={isActing}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
