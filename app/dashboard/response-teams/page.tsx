'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Anchor, Edit2, Loader2, MapPin, Phone, Plus, Radio, Stethoscope, Truck, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';
import { CardGridSkeleton } from '@/components/ui/skeleton-loaders';

type ResourceType = 'BOAT' | 'HELICOPTER' | 'TRUCK' | 'MEDICAL_TEAM' | 'RESCUE_TEAM' | 'SUPPLY_TRUCK';

interface IncidentOption {
  id: string;
  title: string;
  severity: string;
  status: string;
}

interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: string;
  capacity: number | null;
  currentLocation: string | null;
  contactInfo: string | null;
  organization: { id: string; name: string; type: string } | null;
  activeDeployment: { id: string; status: string; incident: IncidentOption } | null;
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-500/20 text-green-400',
  STANDBY: 'bg-yellow-500/20 text-yellow-400',
  DISPATCHED: 'bg-orange-500/20 text-orange-400',
  EN_ROUTE: 'bg-blue-500/20 text-blue-400',
  ON_SITE: 'bg-purple-500/20 text-purple-400',
};

const typeIcon: Record<ResourceType, React.ReactNode> = {
  BOAT: <Anchor className="h-5 w-5" />,
  HELICOPTER: <Zap className="h-5 w-5" />,
  TRUCK: <Truck className="h-5 w-5" />,
  MEDICAL_TEAM: <Stethoscope className="h-5 w-5" />,
  RESCUE_TEAM: <Radio className="h-5 w-5" />,
  SUPPLY_TRUCK: <Truck className="h-5 w-5" />,
};

const initialResourceForm = {
  name: '',
  type: 'TRUCK' as ResourceType,
  capacity: '',
  contactPhone: '',
  latitude: '',
  longitude: '',
};

export default function ResponseTeamsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deployingResource, setDeployingResource] = useState<Resource | null>(null);
  const [resourceForm, setResourceForm] = useState(initialResourceForm);
  const [deployIncidentId, setDeployIncidentId] = useState('');

  const loadResources = useCallback(async () => {
    try {
      const [resourcesResponse, incidentsResponse] = await Promise.all([
        fetch('/api/rescue-resources', { cache: 'no-store' }),
        fetch('/api/incidents', { cache: 'no-store' }),
      ]);

      if (!resourcesResponse.ok) {
        throw new Error(resourcesResponse.status === 401 || resourcesResponse.status === 403 ? 'You do not have access to rescue resource operations.' : 'Failed to load rescue resources.');
      }

      const resourcesData = await resourcesResponse.json() as Resource[];
      setResources(resourcesData);

      if (incidentsResponse.ok) {
        const incidentsData = await incidentsResponse.json() as IncidentOption[];
        setIncidents(incidentsData.filter((incident) => incident.status !== 'CLOSED' && incident.status !== 'RESOLVED'));
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rescue resources.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
    const interval = setInterval(loadResources, 30000);
    return () => clearInterval(interval);
  }, [loadResources]);

  const metrics = useMemo(() => {
    const available = resources.filter((resource) => resource.status === 'AVAILABLE').length;
    const deployed = resources.filter((resource) => resource.activeDeployment).length;
    const medical = resources.filter((resource) => resource.type === 'MEDICAL_TEAM').length;
    return { available, deployed, medical };
  }, [resources]);

  const handleCreateOrUpdate = async () => {
    const method = editingResource ? 'PATCH' : 'POST';
    const url = editingResource ? `/api/rescue-resources/${editingResource.id}` : '/api/rescue-resources';
    setActingId(editingResource?.id ?? 'create');
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save rescue resource.');
      setIsCreateOpen(false);
      setEditingResource(null);
      setResourceForm(initialResourceForm);
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rescue resource.');
    } finally {
      setActingId(null);
    }
  };

  const handleDeploy = async (resource: Resource) => {
    if (!deployIncidentId) return;
    setActingId(resource.id);
    try {
      const response = await fetch(`/api/rescue-resources/${resource.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: deployIncidentId, action: 'dispatch' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to deploy resource.');
      setDeployingResource(null);
      setDeployIncidentId('');
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy resource.');
    } finally {
      setActingId(null);
    }
  };

  const handleRelease = async (resource: Resource, action: 'complete' | 'recall') => {
    setActingId(resource.id);
    try {
      const response = await fetch(`/api/rescue-resources/${resource.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: resource.activeDeployment?.incident.id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to update deployment.');
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deployment.');
    } finally {
      setActingId(null);
    }
  };

  if (isLoading) return <CardGridSkeleton cards={4} />;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-white">Rescue Resources</h1>
          <p className="text-slate-400">Manage field assets, deploy teams to live incidents, and keep response availability accurate.</p>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge label="Live" />
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white" onClick={() => { setEditingResource(null); setResourceForm(initialResourceForm); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add Resource
          </Button>
        </div>
      </HeaderMotion>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[
          { label: 'Available Resources', value: metrics.available, color: 'text-green-400' },
          { label: 'Active Deployments', value: metrics.deployed, color: 'text-orange-400' },
          { label: 'Medical Teams', value: metrics.medical, color: 'text-blue-400' },
        ].map((metric) => (
          <Card key={metric.label} className="border-slate-800 bg-slate-900/55 backdrop-blur">
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
              <p className="text-xs text-slate-500">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {resources.length === 0 ? (
        <div className="py-20 text-center">
          <Truck className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">No rescue resources found</p>
          <p className="mt-2 text-sm text-slate-500">Add the first resource to begin managing live deployments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {resources.map((resource) => (
            <Card key={resource.id} className="border-slate-800 bg-slate-900/50 backdrop-blur transition-all hover:border-slate-700">
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-orange-500/10 p-2 text-orange-400">{typeIcon[resource.type] ?? <Truck className="h-5 w-5" />}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{resource.name}</h3>
                      <p className="text-sm text-slate-400">{resource.organization?.name ?? 'Response team asset'}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[resource.status] ?? 'bg-slate-500/20 text-slate-400'}>{resource.status.replace('_', ' ')}</Badge>
                </div>

                <div className="mb-4 space-y-2">
                  {resource.currentLocation && <div className="flex items-center gap-2 text-slate-300"><MapPin className="h-4 w-4 text-slate-500" /><span className="text-sm">{resource.currentLocation}</span></div>}
                  {resource.capacity !== null && <div className="flex items-center gap-2 text-slate-300"><Truck className="h-4 w-4 text-slate-500" /><span className="text-sm">Capacity: {resource.capacity}</span></div>}
                  {resource.contactInfo && <div className="flex items-center gap-2 text-slate-300"><Phone className="h-4 w-4 text-slate-500" /><span className="text-sm">{resource.contactInfo}</span></div>}
                </div>

                {resource.activeDeployment && (
                  <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active Deployment</p>
                    <p className="mt-1 text-sm font-medium text-white">{resource.activeDeployment.incident.title}</p>
                    <p className="text-xs text-slate-400">{resource.activeDeployment.incident.severity} - {resource.activeDeployment.status.replace('_', ' ')}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800" onClick={() => {
                    setEditingResource(resource);
                    setResourceForm({
                      name: resource.name,
                      type: resource.type,
                      capacity: resource.capacity?.toString() ?? '',
                      contactPhone: resource.contactInfo ?? '',
                      latitude: resource.currentLocation?.split(',')[0]?.trim() ?? '',
                      longitude: resource.currentLocation?.split(',')[1]?.trim() ?? '',
                    });
                    setIsCreateOpen(true);
                  }}>
                    <Edit2 className="mr-1 h-4 w-4" />Edit
                  </Button>

                  {!resource.activeDeployment ? (
                    <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => setDeployingResource(resource)}>
                      <Zap className="mr-1 h-4 w-4" />Deploy
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => handleRelease(resource, 'complete')} disabled={actingId === resource.id}>
                        {actingId === resource.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                        Complete
                      </Button>
                      <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => handleRelease(resource, 'recall')} disabled={actingId === resource.id}>
                        Recall
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Rescue Resource' : 'Add Rescue Resource'}</DialogTitle>
            <DialogDescription className="text-slate-400">Keep the live rescue inventory accurate for response dispatching.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Name</label>
              <Input value={resourceForm.name} onChange={(e) => setResourceForm((current) => ({ ...current, name: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Type</label>
              <select value={resourceForm.type} onChange={(e) => setResourceForm((current) => ({ ...current, type: e.target.value as ResourceType }))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                {Object.keys(typeIcon).map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Capacity</label>
              <Input value={resourceForm.capacity} onChange={(e) => setResourceForm((current) => ({ ...current, capacity: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Contact Phone</label>
              <Input value={resourceForm.contactPhone} onChange={(e) => setResourceForm((current) => ({ ...current, contactPhone: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Latitude</label>
                <Input value={resourceForm.latitude} onChange={(e) => setResourceForm((current) => ({ ...current, latitude: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Longitude</label>
                <Input value={resourceForm.longitude} onChange={(e) => setResourceForm((current) => ({ ...current, longitude: e.target.value }))} className="border-slate-700 bg-slate-900 text-white" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-900" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleCreateOrUpdate} disabled={actingId === 'create' || (editingResource !== null && actingId === editingResource.id)}>
              {actingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Save Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deployingResource)} onOpenChange={(open) => { if (!open) { setDeployingResource(null); setDeployIncidentId(''); } }}>
        <DialogContent className="border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle>Deploy Rescue Resource</DialogTitle>
            <DialogDescription className="text-slate-400">Assign this resource to a live incident.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Incident</label>
            <select value={deployIncidentId} onChange={(e) => setDeployIncidentId(e.target.value)} className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white">
              <option value="">Select incident</option>
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>{incident.title} - {incident.severity}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-900" onClick={() => { setDeployingResource(null); setDeployIncidentId(''); }}>Cancel</Button>
            <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => deployingResource && handleDeploy(deployingResource)} disabled={!deployIncidentId || (deployingResource ? actingId === deployingResource.id : false)}>
              {deployingResource && actingId === deployingResource.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Deploy Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
