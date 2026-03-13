'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Users, Loader2, MapPin, Smartphone, AlertTriangle } from 'lucide-react';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';
import { TablePageSkeleton } from '@/components/ui/skeleton-loaders';

interface Subscriber {
    id: string;
    phoneNumber: string;
    locationName: string;
    zoneName: string;
    zoneRisk: string;
    createdAt: string;
}

const riskColors: Record<string, string> = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/10 text-green-400 border-green-500/30',
};

export default function SafaricomUsersPage() {
    const [subs, setSubs] = useState<Subscriber[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/subscribers')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setSubs(data);
            })
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading && subs.length === 0) return <TablePageSkeleton />;

    return (
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
            <HeaderMotion className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Safaricom Network Users</h1>
                    <p className="text-slate-400">Live active devices physically located within identified flood zones</p>
                </div>
                <div className="flex items-center gap-3">
                    <LiveBadge label="Safaricom Cell Tower Sync Active" className="bg-green-500/10 border-green-500/20 text-green-400" />
                    <Button className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
                        <Download className="w-4 h-4 mr-2" />Export List
                    </Button>
                </div>
            </HeaderMotion>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80">
                    <div className="text-blue-400 mb-3"><Users className="w-5 h-5" /></div>
                    <p className="text-3xl font-bold text-white mb-1">{subs.length.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">Devices in Range</p>
                </div>
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80">
                    <div className="text-orange-400 mb-3"><AlertTriangle className="w-5 h-5" /></div>
                    <p className="text-3xl font-bold text-white mb-1">
                        {subs.filter(s => s.zoneRisk === 'CRITICAL' || s.zoneRisk === 'HIGH').length.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-400">In High-Risk Zones</p>
                </div>
                <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80">
                    <div className="text-green-400 mb-3"><Smartphone className="w-5 h-5" /></div>
                    <p className="text-3xl font-bold text-white mb-1">100%</p>
                    <p className="text-sm text-slate-400">Active Numbers</p>
                </div>
            </div>

            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-800/30">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Phone Number</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Location</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Mapped Flood Zone</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Current Zone Risk</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Identified On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                            No devices mapped to flood zones currently.
                                        </td>
                                    </tr>
                                ) : subs.map((sub) => (
                                    <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Smartphone className="w-4 h-4 text-slate-500" />
                                                <span className="font-mono text-white">
                                                    {sub.phoneNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <MapPin className="w-4 h-4" />
                                                {sub.locationName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-300 font-medium">
                                                {sub.zoneName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={`${riskColors[sub.zoneRisk] ?? 'bg-slate-500/10 text-slate-400'} border px-2.5 py-0.5`}>
                                                {sub.zoneRisk}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(sub.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

