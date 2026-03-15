'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdminDashboardSkeleton } from '@/components/ui/skeleton-loaders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';
import { CheckCircle2, Loader2, Save, Settings as SettingsIcon, Shield, User as UserIcon } from 'lucide-react';

interface HealthCheck {
  id: string;
  service: string;
  status: string;
  message: string | null;
  responseMs: number | null;
  checkedAt: string;
}

interface SettingsPayload {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    lastLoginAt: string | null;
    isActive: boolean;
  };
  organization: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    logoUrl: string | null;
    isActive: boolean;
  };
  smsProvider: {
    id: string;
    name: string;
    baseUrl: string;
    senderId: string;
    isActive: boolean;
    hasApiKey: boolean;
    apiKeyPreview: string;
    updatedAt: string;
  } | null;
  healthChecks: HealthCheck[];
}

function labelRole(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'DISASTER_MANAGER':
      return 'Disaster Manager';
    case 'TELCO_OPERATOR':
      return 'Disaster Manager';
    default:
      return role;
  }
}

function labelService(service: string) {
  switch (service) {
    case 'sms_gateway':
      return 'SMS Gateway';
    case 'database':
      return 'Secure Messaging Database';
    case 'openweather_api':
      return 'OpenWeather API';
    case 'tomorrow_io_api':
      return 'Tomorrow.io API';
    default:
      return service.replace(/_/g, ' ');
  }
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'gateway' ? 'gateway' : searchParams.get('tab') === 'organization' ? 'organization' : 'profile';

  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileName, setProfileName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgLogoUrl, setOrgLogoUrl] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerBaseUrl, setProviderBaseUrl] = useState('');
  const [providerSenderId, setProviderSenderId] = useState('');
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerIsActive, setProviderIsActive] = useState(true);

  const loadSettings = async () => {
    if (!user?.id) return;
    const response = await fetch(`/api/dashboard/settings?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load settings');

    setSettings(payload);
    setProfileName(payload.profile.name);
    setOrgName(payload.organization.name);
    setOrgDescription(payload.organization.description ?? '');
    setOrgEmail(payload.organization.contactEmail ?? '');
    setOrgPhone(payload.organization.contactPhone ?? '');
    setOrgLogoUrl(payload.organization.logoUrl ?? '');
    setProviderName(payload.smsProvider?.name ?? '');
    setProviderBaseUrl(payload.smsProvider?.baseUrl ?? '');
    setProviderSenderId(payload.smsProvider?.senderId ?? '');
    setProviderApiKey('');
    setProviderIsActive(payload.smsProvider?.isActive ?? true);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    loadSettings()
      .catch((err) => setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load settings' }))
      .finally(() => setIsLoading(false));
  }, [authLoading, user?.id]);

  const saveSettings = async (section: 'profile' | 'organization' | 'gateway') => {
    if (!user?.id) return;

    setSavingSection(section);
    setNotice(null);

    try {
      const body: Record<string, unknown> = { userId: user.id };

      if (section === 'profile') {
        body.profile = { name: profileName };
      }

      if (section === 'organization') {
        body.organization = {
          name: orgName,
          description: orgDescription,
          contactEmail: orgEmail,
          contactPhone: orgPhone,
          logoUrl: orgLogoUrl,
        };
      }

      if (section === 'gateway' && settings?.smsProvider) {
        body.smsProvider = {
          id: settings.smsProvider.id,
          name: providerName,
          baseUrl: providerBaseUrl,
          senderId: providerSenderId,
          apiKey: providerApiKey,
          isActive: providerIsActive,
        };
      }

      const response = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to save settings');

      setSettings(payload);
      setProviderApiKey('');
      setNotice({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSavingSection(null);
    }
  };

  const onTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    router.replace(`/dashboard/settings?tab=${nextTab}`);
  };

  if (authLoading || isLoading) return <AdminDashboardSkeleton />;
  if (!user || !settings) return null;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <HeaderMotion className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Manage your live account, organization, and integration settings.</p>
        </div>
        <LiveBadge label="Live Config" />
      </HeaderMotion>

      {notice && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {notice.text}
        </div>
      )}

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-5"><p className="text-xs text-slate-400 mb-2">Signed In As</p><p className="text-lg font-semibold text-white">{settings.profile.email}</p><p className="mt-1 text-sm text-slate-500">{labelRole(settings.profile.role)}</p></CardContent></Card>
        <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-5"><p className="text-xs text-slate-400 mb-2">Organization</p><p className="text-lg font-semibold text-white">{settings.organization.name}</p><p className="mt-1 text-sm text-slate-500">{settings.organization.type}</p></CardContent></Card>
        <Card className="border-slate-800 bg-slate-900/50"><CardContent className="p-5"><p className="text-xs text-slate-400 mb-2">Last Login</p><p className="text-lg font-semibold text-white">{settings.profile.lastLoginAt ? new Date(settings.profile.lastLoginAt).toLocaleString() : 'First login'}</p><p className="mt-1 text-sm text-slate-500">Account {settings.profile.isActive ? 'active' : 'inactive'}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="gap-6">
        <TabsList className="mx-auto h-auto w-fit justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
          <TabsTrigger value="profile" className="rounded-xl px-4 py-2 data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-200"><UserIcon className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="organization" className="rounded-xl px-4 py-2 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-200"><SettingsIcon className="h-4 w-4" /> Organization</TabsTrigger>
          {settings.smsProvider && <TabsTrigger value="gateway" className="rounded-xl px-4 py-2 data-[state=active]:bg-green-500/15 data-[state=active]:text-green-200"><Shield className="h-4 w-4" /> SMS Gateway</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Profile Settings</CardTitle>
              <CardDescription className="text-slate-400">Update the live display details tied to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2"><p className="text-sm text-slate-400">Full Name</p><Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
                <div className="space-y-2"><p className="text-sm text-slate-400">Email</p><Input value={settings.profile.email} disabled className="border-slate-700 bg-slate-950/50 text-slate-400" /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div>
                  <p className="font-medium text-white">Role</p>
                  <p className="text-sm text-slate-500">{labelRole(settings.profile.role)}</p>
                </div>
                <Badge className="border border-green-500/30 bg-green-500/15 text-green-300">{settings.profile.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <Button className="bg-orange-600 text-white hover:bg-orange-700" disabled={savingSection !== null} onClick={() => saveSettings('profile')}>
                {savingSection === 'profile' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Organization Settings</CardTitle>
              <CardDescription className="text-slate-400">Live contact and branding details used across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2"><p className="text-sm text-slate-400">Organization Name</p><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
                <div className="space-y-2"><p className="text-sm text-slate-400">Organization Type</p><Input value={settings.organization.type} disabled className="border-slate-700 bg-slate-950/50 text-slate-400" /></div>
                <div className="space-y-2"><p className="text-sm text-slate-400">Contact Email</p><Input value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
                <div className="space-y-2"><p className="text-sm text-slate-400">Contact Phone</p><Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
              </div>
              <div className="space-y-2"><p className="text-sm text-slate-400">Logo URL</p><Input value={orgLogoUrl} onChange={(e) => setOrgLogoUrl(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
              <div className="space-y-2"><p className="text-sm text-slate-400">Description</p><Textarea value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} className="min-h-28 border-slate-700 bg-slate-950/50 text-white" /></div>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={savingSection !== null} onClick={() => saveSettings('organization')}>
                {savingSection === 'organization' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Organization
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {settings.smsProvider && (
          <TabsContent value="gateway">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-white">SMS Gateway Settings</CardTitle>
                  <CardDescription className="text-slate-400">Live SMS integration values used for outbound messaging.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2"><p className="text-sm text-slate-400">Provider Name</p><Input value={providerName} onChange={(e) => setProviderName(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
                    <div className="space-y-2"><p className="text-sm text-slate-400">Sender ID</p><Input value={providerSenderId} onChange={(e) => setProviderSenderId(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
                  </div>
                  <div className="space-y-2"><p className="text-sm text-slate-400">Base URL</p><Input value={providerBaseUrl} onChange={(e) => setProviderBaseUrl(e.target.value)} className="border-slate-700 bg-slate-950/50 text-white" /></div>
                  <div className="space-y-2"><p className="text-sm text-slate-400">API Key</p><Input type="password" value={providerApiKey} onChange={(e) => setProviderApiKey(e.target.value)} placeholder={settings.smsProvider.apiKeyPreview || 'No API key stored'} className="border-slate-700 bg-slate-950/50 text-white" /></div>
                  <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    <input type="checkbox" checked={providerIsActive} onChange={(e) => setProviderIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900" />
                    Gateway is active for live sends
                  </label>
                  <Button className="bg-green-600 text-white hover:bg-green-700" disabled={savingSection !== null} onClick={() => saveSettings('gateway')}>
                    {savingSection === 'gateway' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Gateway
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 h-fit">
                <CardHeader>
                  <CardTitle className="text-white">Integration Health</CardTitle>
                  <CardDescription className="text-slate-400">Latest live checks relevant to this account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings.healthChecks.map((healthCheck) => (
                    <div key={healthCheck.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{labelService(healthCheck.service)}</p>
                          <p className="text-xs text-slate-500">{healthCheck.message ?? 'No additional message'}</p>
                        </div>
                        <Badge className={`${healthCheck.status === 'UP' ? 'border-green-500/30 bg-green-500/15 text-green-300' : healthCheck.status === 'DEGRADED' ? 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300' : 'border-red-500/30 bg-red-500/15 text-red-300'} border`}>
                          {healthCheck.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{healthCheck.responseMs ?? 0}ms • {new Date(healthCheck.checkedAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {settings.smsProvider.updatedAt && <p className="pt-2 text-xs text-slate-500">Gateway last updated {new Date(settings.smsProvider.updatedAt).toLocaleString()}</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}





