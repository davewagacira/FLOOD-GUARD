'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Edit2, Eye, Loader2, MapPin, Plus, RadioTower, Siren, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HeaderMotion, LiveBadge, ListItem } from '@/components/ui/motion';
import { CardGridSkeleton } from '@/components/ui/skeleton-loaders';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'MONITORING' | 'RESOLVED' | 'CLOSED';
type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface IncidentSummary {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedCount: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  locationName?: string | null;
  county?: string | null;
  latestUpdate?: { id: string; message: string; updatedBy: string | null; createdAt: string } | null;
  _count: { distressSignals: number; deployments: number };
}

interface IncidentDetail extends IncidentSummary {
  organization?: { id: string; name: string; type: string } | null;
  location?: { id: string; name: string; county: string; latitude: number; longitude: number } | null;
  updates: Array<{ id: string; message: string; updatedBy: string | null; createdAt: string }>;
  deployments: Array<{ id: string; status: string; dispatchedAt: string; resource: { id: string; name: string; type: string; contactPhone: string | null; isAvailable: boolean } }>;
  distressSignals: Array<{ id: string; phoneNumber: string; signalType: string; status: string; rawMessage: string; createdAt: string }>;
}

const severityColors: Record<IncidentSeverity, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const statusColors: Record<IncidentStatus, string> = {
  OPEN: 'bg-red-500/20 text-red-400',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  MONITORING: 'bg-yellow-500/20 text-yellow-400',
  RESOLVED: 'bg-green-500/20 text-green-400',
  CLOSED: 'bg-slate-500/20 text-slate-400',
};

const initialForm = {
  title: '',
  description: '',
  severity: 'MEDIUM' as IncidentSeverity,
  status: 'OPEN' as IncidentStatus,
  affectedCount: '',
  latitude: '',
  longitude: '',
  initialUpdate: '',
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(initialForm);
  const [updateForm, setUpdateForm] = useState({ status: 'OPEN' as IncidentStatus, severity: 'MEDIUM' as IncidentSeverity, affectedCount: '', description: '', updateMessage: '' });

  const fetchIncidents = useCallback(async () => {
    const response = await fetch('/api/incidents', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(response.status === 401 || response.status === 403 ? 'You do not have permission to access incidents.' : 'Failed to load incidents.');
    }
    return response.json() as Promise<IncidentSummary[]>;
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchIncidents]);

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, [loadIncidents]);

  const openIncident = useCallback(async (incidentId: string) => {
    setIsDetailLoading(true);
    setUpdateError(null);
    setIsSheetOpen(true);
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load incident details.');
      const detail = await response.json() as IncidentDetail;
      setSelectedIncident(detail);
      setUpdateForm({
        status: detail.status,
        severity: detail.severity,
        affectedCount: detail.affectedCount?.toString() ?? '',
        description: detail.description ?? '',
        updateMessage: '',
      });
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to load incident details.');
      setSelectedIncident(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const incidentMetrics = useMemo(() => {
    const open = incidents.filter((incident) => incident.status === 'OPEN' || incident.status === 'IN_PROGRESS').length;
    const resolved = incidents.filter((incident) => incident.status === 'RESOLVED' || incident.status === 'CLOSED').length;
    const critical = incidents.filter((incident) => incident.severity === 'CRITICAL').length;
    const affected = incidents.reduce((sum, incident) => sum + (incident.affectedCount ?? 0), 0);
    return { open, resolved, critical, affected };
  }, [incidents]);

  const handleCreate = async () => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          affectedCount: createForm.affectedCount,
          latitude: createForm.latitude,
          longitude: createForm.longitude,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to create incident.');

      setCreateForm(initialForm);
      setIsCreateOpen(false);
      await loadIncidents();
      await openIncident(payload.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create incident.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedIncident) return;
    setIsSaving(true);
    setUpdateError(null);
    try {
      const response = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to update incident.');

      setSelectedIncident(payload);
      setUpdateForm((current) => ({ ...current, updateMessage: '' }));
      await loadIncidents();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update incident.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <CardGridSkeleton cards={4} />;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-white">Incidents</h1>
          <p className="text-slate-400">Track live flood incidents, distress escalation, and response updates from one admin workflow.</p>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge label="Live" />
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Report Incident
          </Button>
        </div>
      </HeaderMotion>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open Response', value: incidentMetrics.open, icon: <Siren className="h-4 w-4" />, color: 'text-red-400' },
          { label: 'Critical', value: incidentMetrics.critical, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-400' },
          { label: 'Resolved', value: incidentMetrics.resolved, icon: <Clock className="h-4 w-4" />, color: 'text-green-400' },
          { label: 'People Affected', value: incidentMetrics.affected > 0 ? incidentMetrics.affected.toLocaleString() : '-', icon: <Users className="h-4 w-4" />, color: 'text-blue-400' },
        ].map((metric) => (
          <Card key={metric.label} className="border-slate-800 bg-slate-900/55 backdrop-blur">
            <CardContent className="flex items-center gap-3 p-5">
              <div className={`${metric.color}`}>{metric.icon}</div>
              <div>
                <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                <p className="text-xs text-slate-500">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {incidents.length === 0 ? (
        <div className="py-20 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">No incidents reported</p>
          <p className="mt-2 text-sm text-slate-500">Incidents will appear here as they are detected or manually reported.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident, index) => (
            <ListItem key={incident.id} index={index}>
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur transition-all hover:border-slate-700">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start gap-4">
                    <div className={`rounded-lg p-2 ${severityColors[incident.severity]}`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                        <Badge className={`${severityColors[incident.severity]} border text-xs`}>{incident.severity}</Badge>
                        <Badge className={`${statusColors[incident.status]} text-xs`}>{incident.status.replace('_', ' ')}</Badge>
                      </div>
                      {incident.description && <p className="mb-3 text-sm text-slate-400">{incident.description}</p>}
                      <div className="grid gap-4 rounded-lg bg-slate-800/30 p-4 md:grid-cols-5">
                        <div>
                          <p className="mb-1 text-xs text-slate-400">Affected People</p>
                          <div className="flex items-center gap-1 text-sm font-semibold text-white"><Users className="h-3.5 w-3.5" />{incident.affectedCount?.toLocaleString() ?? '-'}</div>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-slate-400">Reported</p>
                          <div className="flex items-center gap-1 text-sm font-semibold text-white"><Clock className="h-3.5 w-3.5" />{timeAgo(incident.createdAt)}</div>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-slate-400">Location</p>
                          <div className="flex items-center gap-1 text-sm font-semibold text-white"><MapPin className="h-3.5 w-3.5" />{incident.locationName ?? incident.county ?? 'Manual incident'}</div>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-slate-400">Distress Signals</p>
                          <p className="text-sm font-semibold text-white">{incident._count.distressSignals}</p>
                        </div>
                        <div className="flex items-end gap-2">
                          <Button variant="outline" size="sm" className="flex-1 border-slate-700 hover:bg-slate-800" onClick={() => openIncident(incident.id)}>
                            <Eye className="mr-1 h-4 w-4" />Details
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 border-slate-700 hover:bg-slate-800" onClick={() => openIncident(incident.id)}>
                            <Edit2 className="mr-1 h-4 w-4" />Update
                          </Button>
                        </div>
                      </div>
                      {incident.latestUpdate && (
                        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Latest Update</p>
                          <p className="mt-1 text-sm text-slate-300">{incident.latestUpdate.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Incident</DialogTitle>
            <DialogDescription className="text-slate-400">Create a live incident record for response teams and downstream dashboards.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Title</label>
              <Input value={createForm.title} onChange={(e) => setCreateForm((current) => ({ ...current, title: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Severity</label>
              <select value={createForm.severity} onChange={(e) => setCreateForm((current) => ({ ...current, severity: e.target.value as IncidentSeverity }))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                {Object.keys(severityColors).map((severity) => <option key={severity} value={severity}>{severity}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Status</label>
              <select value={createForm.status} onChange={(e) => setCreateForm((current) => ({ ...current, status: e.target.value as IncidentStatus }))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                {Object.keys(statusColors).map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Affected Count</label>
              <Input value={createForm.affectedCount} onChange={(e) => setCreateForm((current) => ({ ...current, affectedCount: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Latitude</label>
                <Input value={createForm.latitude} onChange={(e) => setCreateForm((current) => ({ ...current, latitude: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Longitude</label>
                <Input value={createForm.longitude} onChange={(e) => setCreateForm((current) => ({ ...current, longitude: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Description</label>
              <Textarea value={createForm.description} onChange={(e) => setCreateForm((current) => ({ ...current, description: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Initial Update</label>
              <Textarea value={createForm.initialUpdate} onChange={(e) => setCreateForm((current) => ({ ...current, initialUpdate: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
            </div>
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-900" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Save Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full border-slate-800 bg-slate-950 text-white sm:max-w-2xl">
          <SheetHeader className="border-b border-slate-800 px-6 py-5">
            <SheetTitle className="text-white">{selectedIncident?.title ?? 'Incident Details'}</SheetTitle>
            <SheetDescription className="text-slate-400">Review the incident timeline, update status, and keep the response record current.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isDetailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>
            ) : selectedIncident ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`${severityColors[selectedIncident.severity]} border text-xs`}>{selectedIncident.severity}</Badge>
                  <Badge className={`${statusColors[selectedIncident.status]} text-xs`}>{selectedIncident.status.replace('_', ' ')}</Badge>
                  {selectedIncident.organization?.name && <Badge className="bg-slate-800 text-slate-300">{selectedIncident.organization.name}</Badge>}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-4"><p className="text-xs text-slate-500">Affected People</p><p className="mt-1 text-lg font-semibold text-white">{selectedIncident.affectedCount?.toLocaleString() ?? '-'}</p></CardContent></Card>
                  <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-4"><p className="text-xs text-slate-500">Distress Signals</p><p className="mt-1 text-lg font-semibold text-white">{selectedIncident._count.distressSignals}</p></CardContent></Card>
                  <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-4"><p className="text-xs text-slate-500">Deployments</p><p className="mt-1 text-lg font-semibold text-white">{selectedIncident._count.deployments}</p></CardContent></Card>
                  <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-4"><p className="text-xs text-slate-500">Coordinates</p><p className="mt-1 text-sm font-semibold text-white">{selectedIncident.latitude && selectedIncident.longitude ? `${selectedIncident.latitude.toFixed(5)}, ${selectedIncident.longitude.toFixed(5)}` : 'Manual incident'}</p></CardContent></Card>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Description</p>
                  <p className="mt-2 text-sm text-slate-300">{selectedIncident.description || 'No description provided.'}</p>
                  {selectedIncident.location && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                      <MapPin className="h-4 w-4" />
                      {selectedIncident.location.name}, {selectedIncident.location.county}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="mb-4 text-xs uppercase tracking-[0.18em] text-slate-500">Update Incident</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">Status</label>
                      <select value={updateForm.status} onChange={(e) => setUpdateForm((current) => ({ ...current, status: e.target.value as IncidentStatus }))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white">
                        {Object.keys(statusColors).map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">Severity</label>
                      <select value={updateForm.severity} onChange={(e) => setUpdateForm((current) => ({ ...current, severity: e.target.value as IncidentSeverity }))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white">
                        {Object.keys(severityColors).map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">Affected Count</label>
                      <Input value={updateForm.affectedCount} onChange={(e) => setUpdateForm((current) => ({ ...current, affectedCount: e.target.value }))} className="border-slate-700 bg-slate-950 text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-slate-300">Description</label>
                      <Textarea value={updateForm.description} onChange={(e) => setUpdateForm((current) => ({ ...current, description: e.target.value }))} className="border-slate-700 bg-slate-950 text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-slate-300">Update Note</label>
                      <Textarea value={updateForm.updateMessage} onChange={(e) => setUpdateForm((current) => ({ ...current, updateMessage: e.target.value }))} className="border-slate-700 bg-slate-950 text-white" />
                    </div>
                  </div>
                  {updateError && <p className="mt-3 text-sm text-red-400">{updateError}</p>}
                  <div className="mt-4 flex justify-end">
                    <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleUpdate} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="mb-4 text-xs uppercase tracking-[0.18em] text-slate-500">Incident Timeline</p>
                  <div className="space-y-3">
                    {selectedIncident.updates.length > 0 ? selectedIncident.updates.map((update) => (
                      <div key={update.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <p className="text-sm text-slate-200">{update.message}</p>
                        <p className="mt-2 text-xs text-slate-500">{update.updatedBy ?? 'System'} - {new Date(update.createdAt).toLocaleString()}</p>
                      </div>
                    )) : <p className="text-sm text-slate-500">No incident updates recorded yet.</p>}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                    <p className="mb-4 text-xs uppercase tracking-[0.18em] text-slate-500">Deployments</p>
                    <div className="space-y-3">
                      {selectedIncident.deployments.length > 0 ? selectedIncident.deployments.map((deployment) => (
                        <div key={deployment.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="text-sm font-medium text-white">{deployment.resource.name}</p>
                          <p className="text-xs text-slate-400">{deployment.resource.type} - {deployment.status}</p>
                          <p className="mt-2 text-xs text-slate-500">{new Date(deployment.dispatchedAt).toLocaleString()}</p>
                        </div>
                      )) : <p className="text-sm text-slate-500">No deployments linked to this incident.</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                    <p className="mb-4 text-xs uppercase tracking-[0.18em] text-slate-500">Recent Distress Signals</p>
                    <div className="space-y-3">
                      {selectedIncident.distressSignals.length > 0 ? selectedIncident.distressSignals.map((signal) => (
                        <div key={signal.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="flex items-center gap-2 text-sm font-medium text-white"><RadioTower className="h-4 w-4 text-orange-400" />{signal.phoneNumber}</p>
                          <p className="text-xs text-slate-400">{signal.signalType} - {signal.status}</p>
                          <p className="mt-2 text-xs text-slate-500 line-clamp-2">{signal.rawMessage}</p>
                        </div>
                      )) : <p className="text-sm text-slate-500">No distress signals linked to this incident.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">No incident selected.</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
