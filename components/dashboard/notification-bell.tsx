'use client';

/**
 * NotificationBell — Ably real-time notifications
 * Subscribes to floodguard:alerts and floodguard:distress channels
 * Shows a badge count, dropdown list, and plays an alert pulse animation
 */

import { useEffect, useRef, useState } from 'react';
import Ably from 'ably';
import { Bell, AlertTriangle, Phone, ShieldAlert, CheckCircle2, X, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    severity: 'critical' | 'high' | 'medium' | 'info';
    timestamp: Date;
    read: boolean;
}

function severityStyle(s: Notification['severity']) {
    if (s === 'critical') return 'text-red-400 bg-red-500/10';
    if (s === 'high') return 'text-orange-400 bg-orange-500/10';
    if (s === 'medium') return 'text-yellow-400 bg-yellow-500/10';
    return 'text-blue-400 bg-blue-500/10';
}

function NotificationIcon({ type }: { type: string }) {
    if (type === 'FLOOD_ALERT' || type === 'RISK_UPDATE') return <AlertTriangle className="w-4 h-4" />;
    if (type === 'DISTRESS_SIGNAL') return <Phone className="w-4 h-4" />;
    if (type === 'ALERT_APPROVED') return <CheckCircle2 className="w-4 h-4" />;
    if (type === 'INCIDENT_CREATED') return <ShieldAlert className="w-4 h-4" />;
    return <Bell className="w-4 h-4" />;
}

function timeAgo(d: Date) {
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
}

export function NotificationBell({ userId }: { userId?: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [connected, setConnected] = useState(false);
    const [pulse, setPulse] = useState(false);
    const clientRef = useRef<Ably.Realtime | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unread = notifications.filter(n => !n.read).length;

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const addNotification = (type: string, data: Record<string, unknown>) => {
        const n: Notification = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            title: buildTitle(type, data),
            body: buildBody(type, data),
            severity: buildSeverity(type, data),
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [n, ...prev].slice(0, 50));
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
        // Browser notification if permitted
        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`FloodGuard: ${n.title}`, { body: n.body, icon: '/favicon.ico' });
        }
    };

    // Connect to Ably
    useEffect(() => {
        const client = new Ably.Realtime({
            key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
            clientId: userId ?? 'anonymous',
            recover: (_, cb) => cb(true),
        });
        clientRef.current = client;

        client.connection.on('connected', () => setConnected(true));
        client.connection.on('disconnected', () => setConnected(false));
        client.connection.on('failed', () => setConnected(false));

        const channels = [
            client.channels.get('floodguard:alerts'),
            client.channels.get('floodguard:distress'),
        ];
        if (userId) channels.push(client.channels.get(`floodguard:user:${userId}`));

        channels.forEach(ch => {
            ch.subscribe((msg) => addNotification(msg.name || 'UNKNOWN', msg.data as Record<string, unknown>));
        });

        // Request browser notification permission
        if (typeof window !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => { client.close(); };
    }, [userId]);

    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead(); }}
                className={cn(
                    'relative p-2 rounded-lg transition-all',
                    open ? 'bg-slate-700/60 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                    pulse && 'ring-2 ring-orange-500/60'
                )}
                title="Notifications"
            >
                <Bell className={cn('w-5 h-5 transition-transform', pulse && 'scale-110')} />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
                {/* Connection dot */}
                <span className={cn(
                    'absolute bottom-1 right-1 w-2 h-2 rounded-full border border-slate-900',
                    connected ? 'bg-green-400' : 'bg-red-400'
                )} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/50">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-orange-400" />
                            <span className="font-semibold text-white text-sm">Notifications</span>
                            {connected ? (
                                <span className="flex items-center gap-1 text-xs text-green-400"><Wifi className="w-3 h-3" />Live</span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-red-400"><WifiOff className="w-3 h-3" />Offline</span>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <button onClick={markAllRead} className="text-xs text-slate-400 hover:text-white transition-colors">
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400 text-sm">No notifications yet</p>
                                <p className="text-slate-600 text-xs mt-1">{connected ? 'Listening for live events...' : 'Connecting...'}</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={cn(
                                    'flex items-start gap-3 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors',
                                    !n.read && 'bg-slate-800/20'
                                )}>
                                    <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', severityStyle(n.severity))}>
                                        <NotificationIcon type={n.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                                        <p className="text-xs text-slate-600 mt-1">{timeAgo(n.timestamp)}</p>
                                    </div>
                                    <button onClick={() => dismiss(n.id)} className="text-slate-600 hover:text-slate-400 flex-shrink-0 mt-0.5">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────
function buildTitle(type: string, data: Record<string, unknown>): string {
    switch (type) {
        case 'FLOOD_ALERT': return `Flood Alert — ${data.zoneName ?? 'Unknown Zone'}`;
        case 'RISK_UPDATE': return `Risk Updated — ${data.zoneName ?? 'Zone'}`;
        case 'DISTRESS_SIGNAL': return `Distress Signal — ${data.phoneNumber ?? 'Unknown'}`;
        case 'ALERT_APPROVED': return `Alert Approved`;
        case 'SMS_SENT': return `SMS Broadcast Sent`;
        case 'INCIDENT_CREATED': return `New Incident — ${data.title ?? ''}`;
        case 'SYSTEM_HEALTH': return `System: ${data.service ?? 'Service'} ${data.status}`;
        default: return type.replace(/_/g, ' ');
    }
}

function buildBody(type: string, data: Record<string, unknown>): string {
    switch (type) {
        case 'FLOOD_ALERT': return `${data.riskLevel} risk (Score: ${data.riskScore}/100) detected in ${data.zoneName}`;
        case 'RISK_UPDATE': return `Risk changed from ${data.prevLevel} → ${data.riskLevel} (Score: ${data.riskScore}/100)`;
        case 'DISTRESS_SIGNAL': return `[${data.signalType}] from ${data.phoneNumber}${data.location ? ` near ${data.location}` : ''}`;
        case 'ALERT_APPROVED': return `Alert approved for ${data.recipientCount?.toLocaleString() ?? 'N/A'} recipients`;
        case 'SMS_SENT': return `${data.count} messages sent to ${data.zone}`;
        case 'INCIDENT_CREATED': return `New ${data.severity} severity incident reported`;
        case 'SYSTEM_HEALTH': return data.message ? String(data.message) : `${data.service} is ${data.status}`;
        default: return JSON.stringify(data).slice(0, 100);
    }
}

function buildSeverity(type: string, data: Record<string, unknown>): Notification['severity'] {
    if (type === 'DISTRESS_SIGNAL') return 'critical';
    if (type === 'FLOOD_ALERT' || type === 'RISK_UPDATE') {
        const lvl = String(data.riskLevel ?? '');
        if (lvl === 'CRITICAL') return 'critical';
        if (lvl === 'HIGH') return 'high';
        if (lvl === 'MEDIUM') return 'medium';
    }
    if (type === 'INCIDENT_CREATED') {
        if (data.severity === 'CRITICAL') return 'critical';
        if (data.severity === 'HIGH') return 'high';
    }
    return 'info';
}
