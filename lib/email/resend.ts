/**
 * Resend Email Client — FloodGuard Platform
 * For admin alerts, incident notifications, and system reports
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.FROM_EMAIL ?? 'Flood Guard <hello@nairobifeast.com>';

export interface EmailResult { success: boolean; id?: string; error?: string; }

/** Send a plain or HTML email */
export async function sendEmail(params: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}): Promise<EmailResult> {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to: Array.isArray(params.to) ? params.to : [params.to],
            subject: params.subject,
            html: params.html,
            text: params.text,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, id: data?.id };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/** Pre-built: flood alert email to a coordinator */
export async function sendFloodAlertEmail(params: {
    to: string;
    coordinatorName: string;
    zoneName: string;
    riskLevel: string;
    riskScore: number;
    recommendations: string[];
}): Promise<EmailResult> {
    const riskColor = params.riskLevel === 'CRITICAL' ? '#ef4444' : params.riskLevel === 'HIGH' ? '#f97316' : '#eab308';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:28px 32px;border-bottom:1px solid #334155;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="background:#f97316;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-size:18px;">💧</span>
          </div>
          <span style="color:white;font-size:20px;font-weight:700;">FloodGuard</span>
        </div>
        <p style="color:#94a3b8;margin:0;font-size:14px;">Disaster Intelligence Platform</p>
      </div>

      <!-- Alert block -->
      <div style="padding:28px 32px;">
        <div style="background:${riskColor}22;border:1px solid ${riskColor}55;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="background:${riskColor};color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:0.05em;">${params.riskLevel} RISK</span>
          </div>
          <h1 style="color:white;font-size:22px;margin:0 0 6px;font-weight:700;">Flood Alert: ${params.zoneName}</h1>
          <p style="color:#94a3b8;margin:0;font-size:14px;">Risk score: ${params.riskScore}/100 • ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
        </div>

        <p style="color:#cbd5e1;font-size:15px;">Hi ${params.coordinatorName},</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;">The FloodGuard system has detected a <strong style="color:${riskColor};">${params.riskLevel}</strong> flood risk in <strong style="color:white;">${params.zoneName}</strong>. Immediate attention may be required.</p>

        <h3 style="color:white;font-size:15px;margin:20px 0 12px;">Recommended Actions</h3>
        ${params.recommendations.map(r => `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;"><span style="color:#f97316;margin-top:2px;">→</span><span style="color:#94a3b8;font-size:14px;">${r}</span></div>`).join('')}
      </div>

      <!-- Footer -->
      <div style="background:#0f172a;padding:20px 32px;border-top:1px solid #334155;">
        <p style="color:#475569;font-size:12px;margin:0;">Sent by FloodGuard • FloodGuard Disaster Intelligence • Nairobi, Kenya</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    return sendEmail({
        to: params.to,
        subject: `🚨 ${params.riskLevel} Flood Alert — ${params.zoneName}`,
        html,
        text: `Flood Alert: ${params.zoneName}\nRisk: ${params.riskLevel} (${params.riskScore}/100)\n\nActions:\n${params.recommendations.map(r => `• ${r}`).join('\n')}`,
    });
}
