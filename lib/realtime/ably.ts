/**
 * Ably Real-time Client — FloodGuard Platform
 *
 * Channel naming convention:
 *   floodguard:alerts          → flood alerts published to all users
 *   floodguard:distress        → new distress signals
 *   floodguard:admin           → admin-only system events
 *   floodguard:zone:{zoneId}   → per-zone weather/risk updates
 *   floodguard:user:{userId}   → direct user notifications
 */

import Ably from 'ably';

// Server-side singleton (uses full API key)
const globalForAbly = globalThis as unknown as { ablyServer?: Ably.Rest };

export const ablyServer: Ably.Rest =
    globalForAbly.ablyServer ??
    new Ably.Rest({ key: process.env.ABLY_API_KEY! });

if (process.env.NODE_ENV !== 'production') {
    globalForAbly.ablyServer = ablyServer;
}

export type FloodGuardEvent =
    | { type: 'FLOOD_ALERT'; zoneId: string; zoneName: string; riskLevel: string; riskScore: number }
    | { type: 'DISTRESS_SIGNAL'; signalId: string; phoneNumber: string; location?: string; signalType: string }
    | { type: 'RISK_UPDATE'; zoneId: string; zoneName: string; riskLevel: string; riskScore: number; prevLevel: string }
    | { type: 'ALERT_APPROVED'; alertId: string; title: string; recipientCount: number }
    | { type: 'SMS_SENT'; count: number; zone: string }
    | { type: 'SYSTEM_HEALTH'; service: string; status: string; message?: string }
    | { type: 'INCIDENT_CREATED'; incidentId: string; title: string; severity: string };

/** Publish an event to a FloodGuard channel */
export async function publishEvent(channel: string, event: FloodGuardEvent): Promise<void> {
    await ablyServer.channels.get(channel).publish(event.type, event);
}

/** Publish to global alerts channel */
export async function publishAlert(event: FloodGuardEvent): Promise<void> {
    await publishEvent('floodguard:alerts', event);
}

/** Publish distress signal to NGO channel */
export async function publishDistressSignal(event: Extract<FloodGuardEvent, { type: 'DISTRESS_SIGNAL' }>): Promise<void> {
    await publishEvent('floodguard:distress', event);
}

/** Publish zone-specific update */
export async function publishZoneUpdate(zoneId: string, event: FloodGuardEvent): Promise<void> {
    await publishEvent(`floodguard:zone:${zoneId}`, event);
}

/** Issue a short-lived token for a client (used by /api/ably/auth) */
export async function createAblyToken(clientId: string): Promise<any> {
    const tokenRequest = await ablyServer.auth.createTokenRequest({
        clientId,
        capability: {
            'floodguard:alerts': ['subscribe'],
            'floodguard:distress': ['subscribe'],
            [`floodguard:user:${clientId}`]: ['subscribe', 'publish'],
            'floodguard:*': ['subscribe'],
        },
        ttl: 3600 * 1000, // 1 hour
    });
    return tokenRequest;
}
