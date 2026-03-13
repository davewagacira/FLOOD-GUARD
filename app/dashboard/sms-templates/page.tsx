'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CardGridSkeleton } from '@/components/ui/skeleton-loaders';
import { Loader2, MessageSquare, Send, Smartphone } from 'lucide-react';

interface SmsTemplate {
  id: string;
  name: string;
  category: 'Warning' | 'Critical' | 'Info' | 'Advisory';
  status: 'active';
  body: string;
  description: string;
}

interface SmsRecipient {
  id: string;
  phoneNumber: string;
  locationName: string;
  zoneName: string;
  zoneRisk: string;
}

interface TemplatesPayload {
  templates: SmsTemplate[];
  recipients: SmsRecipient[];
}

const categoryColors: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  Warning: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Advisory: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

function formatPhone(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length !== 12) return phoneNumber;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`;
}

export default function SMSTemplatesPage() {
  const [data, setData] = useState<TemplatesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTemplates = async () => {
    const response = await fetch('/api/dashboard/sms-templates', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load templates');
    setData(payload);
  };

  useEffect(() => {
    loadTemplates()
      .catch((err) => setResultMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load templates' }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSend = async (template: SmsTemplate) => {
    setSendingId(template.id);
    setResultMsg(null);

    try {
      const response = await fetch('/api/dashboard/sms-templates/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Template: ${template.name}`,
          message: template.body,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.message || 'Failed to send demo');

      setResultMsg({
        type: payload.failed > 0 ? 'error' : 'success',
        text: payload.failed > 0
          ? `Sent ${payload.sent} of ${payload.totalSubscribers}. ${payload.failed} failed.`
          : `Demo SMS sent to all ${payload.sent} live recipients.`,
      });

      await loadTemplates();
    } catch (err) {
      setResultMsg({ type: 'error', text: err instanceof Error ? err.message : 'Send failed' });
    } finally {
      setSendingId(null);
    }
  };

  if (isLoading) return <CardGridSkeleton cards={6} />;

  const templates = data?.templates ?? [];
  const recipients = data?.recipients ?? [];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">SMS Templates</h1>
          <p className="text-slate-400">Live template catalog with demo sends targeting the saved telco recipients.</p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-300">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">{templates.length} templates • {recipients.length} live recipients</span>
        </div>
      </div>

      {resultMsg && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${resultMsg.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {resultMsg.text}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6 lg:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="border-slate-800 bg-slate-900/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-white">{template.name}</h3>
                    <Badge className={`${categoryColors[template.category]} border`}>{template.category}</Badge>
                  </div>
                  <Badge className="border border-green-500/30 bg-green-500/15 text-green-300">{template.status}</Badge>
                </div>

                <p className="mb-4 text-sm text-slate-400">{template.description}</p>

                <div className="mb-4 rounded-lg border border-slate-700/40 bg-slate-950/50 p-4">
                  <p className="whitespace-pre-line text-sm font-mono leading-relaxed text-slate-200">{template.body}</p>
                </div>

                <div className="mb-5 flex items-center justify-between text-xs text-slate-500">
                  <span>{template.body.length} chars</span>
                  <span>Targets the 2 saved telco recipients</span>
                </div>

                <Button
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={sendingId !== null}
                  onClick={() => handleSend(template)}
                >
                  {sendingId === template.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Demo To Live Recipients
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-slate-800 bg-slate-900/60 h-fit">
          <CardContent className="p-6">
            <h2 className="mb-2 text-xl font-semibold text-white">Active Recipients</h2>
            <p className="mb-5 text-sm text-slate-400">These are the exact numbers used when you click any `Send Demo` button.</p>

            <div className="space-y-3">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    <span className="font-mono">{formatPhone(recipient.phoneNumber)}</span>
                  </div>
                  <p className="text-sm text-slate-400">{recipient.zoneName}</p>
                  <p className="text-xs text-slate-500">{recipient.locationName}</p>
                  <Badge className={`mt-3 ${recipient.zoneRisk === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' : recipient.zoneRisk === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'} border`}>
                    {recipient.zoneRisk}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

