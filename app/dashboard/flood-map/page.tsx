'use client';

declare var google: any;

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, RefreshCw, AlertTriangle, Users, Droplets, Wind,
  Thermometer, Cloud, MapPin, Hospital, Shield, School,
  ChevronRight, X, Plus, Edit2, Trash2, Zap, Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderMotion, LiveBadge } from '@/components/ui/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { extractAggregationMetadataFromPayload, extractDerivedMetricsFromPayload } from '@/lib/weather/derived-metrics';

/* â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface Zone {
  id: string; name: string; code: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  isActive: boolean; population: number | null;
  drainageScore: number; riverProximityKm: number | null;
  elevationM: number | null; historicalFloodScore: number;
  riskDataFresh?: boolean;
  weatherDataFresh?: boolean;
  polygonCoordinates: { lat: number; lng: number }[] | null;
  location: { name: string; county: string; latitude: number; longitude: number; population: number | null };
  assessments: Array<{
    riskScore: number;
    riskLevel: string;
    rainfallScore?: number;
    accumulationScore?: number;
    forecastScore?: number;
    riverScore?: number;
    drainageScore?: number;
    dataQualityScore?: number;
    assessedAt: string;
  }>;
  weatherSnapshot?: {
    temperature: number;
    humidity: number;
    precipitationIntensity: number;
    precipitationProbability: number;
    windSpeed: number;
    confidenceScore: number;
    snapshotAt: string;
    tomorrowPayload?: unknown | null;
    openweatherPayload?: unknown | null;
  } | null;
}

interface NearbyPlace { id: string; name: string; address: string; rating: number | null; lat: number; lng: number; open: boolean | null; }
interface NearbyGroup { type: string; label: string; emoji: string; places: NearbyPlace[] }
interface AiZoneSummary {
  zoneId: string;
  zoneName: string;
  generatedAt: string;
  summary: string;
  recommendations: string[];
  confidence: number;
  context: {
    riskLevel: string;
    riskScore: number | null;
    precipitationIntensity: number | null;
    weatherSnapshotAt: string | null;
    assessedAt: string | null;
  };
}

/* â”€â”€ Risk config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const RISK = {
  CRITICAL: { fill: '#ef444440', stroke: '#ef4444', badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500', bar: 'bg-red-500', label: 'CRITICAL' },
  HIGH: { fill: '#f9731640', stroke: '#f97316', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-500', bar: 'bg-orange-500', label: 'HIGH' },
  MEDIUM: { fill: '#eab30840', stroke: '#eab308', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500', bar: 'bg-yellow-400', label: 'MEDIUM' },
  LOW: { fill: '#22c55e40', stroke: '#22c55e', badge: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-500', bar: 'bg-green-500', label: 'LOW' },
} as const;

const NAIROBI = { lat: -1.286389, lng: 36.817223 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const compactNumber = new Intl.NumberFormat('en-KE', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function getMergedDerivedMetrics(weatherSnapshot: Zone['weatherSnapshot']) {
  const tomorrow = extractDerivedMetricsFromPayload(weatherSnapshot?.tomorrowPayload);
  const openweather = extractDerivedMetricsFromPayload(weatherSnapshot?.openweatherPayload);

  return {
    rainLast1h: tomorrow.rainLast1h ?? openweather.rainLast1h,
    rainLast3h: tomorrow.rainLast3h ?? openweather.rainLast3h,
    rainLast6h: tomorrow.rainLast6h ?? openweather.rainLast6h,
    rainLast24h: tomorrow.rainLast24h ?? openweather.rainLast24h,
    forecastRainNext6h: tomorrow.forecastRainNext6h ?? openweather.forecastRainNext6h,
    forecastRainNext24h: tomorrow.forecastRainNext24h ?? openweather.forecastRainNext24h,
    forecastProbabilityMaxNext6h: tomorrow.forecastProbabilityMaxNext6h ?? openweather.forecastProbabilityMaxNext6h,
    forecastProbabilityMaxNext24h: tomorrow.forecastProbabilityMaxNext24h ?? openweather.forecastProbabilityMaxNext24h,
  };
}

function getRainProbabilityLabel(weatherSnapshot: Zone['weatherSnapshot']): string {
  if (!weatherSnapshot) return 'Rain Probability';

  const hasTomorrow = Boolean(weatherSnapshot.tomorrowPayload);
  const hasOpenWeather = Boolean(weatherSnapshot.openweatherPayload);

  if (hasTomorrow && hasOpenWeather) return 'Rain Probability';
  if (hasTomorrow) return 'Rain Probability';
  return 'Near-Term Rain Probability';
}

function getProviderAgreementNote(weatherSnapshot: Zone['weatherSnapshot']): string {
  if (!weatherSnapshot) return 'Weather signal unavailable';

  const hasTomorrow = Boolean(weatherSnapshot.tomorrowPayload);
  const hasOpenWeather = Boolean(weatherSnapshot.openweatherPayload);

  if (hasTomorrow && hasOpenWeather) return 'Multiple weather signals are closely aligned';
  if (hasTomorrow || hasOpenWeather) return 'Based on one active weather signal';
  return 'Weather signal unavailable';
}

function getOperationalConfidence(weatherSnapshot: Zone['weatherSnapshot']): number | null {
  if (!weatherSnapshot) return null;

  const tomorrowMeta = extractAggregationMetadataFromPayload(weatherSnapshot.tomorrowPayload);
  const openweatherMeta = extractAggregationMetadataFromPayload(weatherSnapshot.openweatherPayload);
  const operationalConfidence = tomorrowMeta.operationalConfidenceScore ?? openweatherMeta.operationalConfidenceScore;

  return typeof operationalConfidence === 'number' ? operationalConfidence : null;
}

/* â”€â”€ Icon map for nearby places â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PLACE_ICONS: Record<string, React.ReactNode> = {
  'Hospital': <Hospital className="w-4 h-4 text-red-400" />,
  'Shelter': <School className="w-4 h-4 text-blue-400" />,
  'Safe Zone': <Shield className="w-4 h-4 text-purple-400" />,
  'Rescue Resource': <Zap className="w-4 h-4 text-orange-400" />,
};

/* â”€â”€ Google Maps loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let mapsLoading: Promise<void> | null = null;
function loadGoogleMaps(key: string): Promise<void> {
  if (mapsLoading) return mapsLoading;
  mapsLoading = new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>).google) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=drawing,geometry,places`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Maps failed'));
    document.head.appendChild(s);
  });
  return mapsLoading;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function FloodMapPage() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN';
  const isDisasterManager = normalizedRole === 'DISASTER_MANAGER' || normalizedRole === 'NGO';
  const canRefreshZoneWeather = isAdmin;
  const canViewAiSummary = isAdmin || isDisasterManager;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const circleRefs = useRef<Map<string, any>>(new Map());
  const markerRefs = useRef<Map<string, any>>(new Map());
  const infoWin = useRef<any>(null);
  const drawingMgr = useRef<any>(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [nearby, setNearby] = useState<NearbyGroup[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [zoneRefreshing, setZoneRefreshing] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'weather' | 'nearby' | 'admin'>('details');
  const [aiSummaryByZone, setAiSummaryByZone] = useState<Record<string, AiZoneSummary>>({});
  const [aiSummaryLoading, setAiSummaryLoading] = useState<string | null>(null);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  const [newPolygonCoords, setNewPolygonCoords] = useState<{ lat: number, lng: number }[] | null>(null);
  const [savingZone, setSavingZone] = useState(false);
  const [newZoneForm, setNewZoneForm] = useState({ name: '', code: '', county: '', population: '' });
  const selectedAiSummary = selected ? aiSummaryByZone[selected.id] : undefined;

  /* â”€â”€ Fetch all zones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const fetchZones = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await fetch('/api/flood-zones/map', { cache: 'no-store' });
      if (!r.ok) {
        const message = r.status === 401 || r.status === 403
          ? 'Your session does not have access to live flood intelligence.'
          : 'Live flood zone data is unavailable right now.';
        throw new Error(message);
      }
      setZones(await r.json());
      setLastUpdate(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      setZones([]);
      setLoadError(error instanceof Error ? error.message : 'Unable to load flood intelligence.');
    }
  }, []);

  /* â”€â”€ Run global weather ingest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const runIngest = useCallback(async () => {
    setIngesting(true);
    setActionError(null);
    try {
      const response = await fetch('/api/weather/ingest', {
        method: 'POST',
      });
      if (!response.ok) {
        const message = response.status === 401 || response.status === 403
          ? 'Only administrators can refresh all flood-zone weather data.'
          : 'Weather refresh failed. Please try again.';
        throw new Error(message);
      }
      await fetchZones();
      setLastUpdate(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Weather refresh failed.');
    } finally { setIngesting(false); }
  }, [fetchZones]);

  /* â”€â”€ Refresh weather for one zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const refreshZoneWeather = useCallback(async (zone: Zone) => {
    setZoneRefreshing(zone.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/flood-zones/${zone.id}/weather`, { method: 'POST' });
      if (!response.ok) {
        const message = response.status === 401 || response.status === 403
          ? 'You do not have permission to refresh this zone.'
          : `Weather refresh failed for ${zone.name}.`;
        throw new Error(message);
      }
      await fetchZones();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Weather refresh failed for ${zone.name}.`);
    } finally { setZoneRefreshing(null); }
  }, [fetchZones]);

  /* â”€â”€ Fetch nearby Places for selected zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const fetchNearby = useCallback(async (zoneId: string) => {
    setNearbyLoading(true);
    setNearby([]);
    try {
      const r = await fetch(`/api/flood-zones/${zoneId}/nearby`);
      if (r.ok) {
        const d = await r.json();
        setNearby(d.nearby ?? []);
      }
    } finally { setNearbyLoading(false); }
  }, []);

  const fetchAiSummary = useCallback(async (zoneId: string, force = false) => {
    if (!canViewAiSummary) return;
    if (!force && aiSummaryByZone[zoneId]) return;

    setAiSummaryLoading(zoneId);
    setAiSummaryError(null);

    try {
      const response = await fetch(`/api/flood-zones/${zoneId}/ai-summary`, {
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'AI summary is unavailable for this flood zone.');
      }

      setAiSummaryByZone((current) => ({
        ...current,
        [zoneId]: payload as AiZoneSummary,
      }));
    } catch (error) {
      setAiSummaryError(error instanceof Error ? error.message : 'Unable to generate AI risk brief.');
    } finally {
      setAiSummaryLoading((current) => (current === zoneId ? null : current));
    }
  }, [aiSummaryByZone, canViewAiSummary]);

  const saveNewZone = async () => {
    if (!newPolygonCoords) return;
    setSavingZone(true);
    setActionError(null);
    // Calc center
    let sumLat = 0, sumLng = 0;
    newPolygonCoords.forEach(c => { sumLat += c.lat; sumLng += c.lng; });
    const center = { lat: sumLat / newPolygonCoords.length, lng: sumLng / newPolygonCoords.length };

    try {
      const response = await fetch('/api/flood-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newZoneForm,
          polygonCoordinates: newPolygonCoords,
          latitude: center.lat,
          longitude: center.lng,
        })
      });
      if (!response.ok) {
        throw new Error('Zone creation failed. Please confirm your permissions and form data.');
      }
      await fetchZones(); // Refresh Map
      setNewPolygonCoords(null); // Close modal
      setNewZoneForm({ name: '', code: '', county: '', population: '' });
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : 'Zone creation failed.');
    } finally {
      setSavingZone(false);
    }
  };

  /* â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    (async () => {
      await fetchZones();
      setLoading(false);
      if (API_KEY) {
        try { await loadGoogleMaps(API_KEY); setMapsReady(true); } catch (e) { console.error(e); }
      }
    })();
  }, [fetchZones]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchZones().catch(() => undefined);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchZones]);

  /* â”€â”€ When a zone is selected, load nearby â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (selected) {
      setActiveTab('details');
      fetchNearby(selected.id);
      fetchAiSummary(selected.id).catch(() => undefined);
      setAiSummaryError(null);
    }
    else setNearby([]);
  }, [selected, fetchAiSummary, fetchNearby]);

  /* â”€â”€ Draw map + overlays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    // Create map once
    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: NAIROBI,
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0f1e2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#6b8aa8' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1e2e' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e3448' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d2137' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a4060' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071626' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d6b8b' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#8fb4d0' }] },
        ],
        disableDefaultUI: false,
        zoomControl: true,
        fullscreenControl: true,
        mapTypeControl: false,
        streetViewControl: false,
      });
      infoWin.current = new google.maps.InfoWindow({ pixelOffset: new google.maps.Size(0, -10) });

      // Drawing manager for polygon editing
      drawingMgr.current = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: { fillColor: '#f97316', fillOpacity: 0.3, strokeColor: '#f97316', strokeWeight: 2, editable: true },
      });
      drawingMgr.current.setMap(mapInstance.current);

      google.maps.event.addListener(drawingMgr.current, 'polygoncomplete', (polygon: any) => {
        const path = polygon.getPath();
        const coords = [];
        for (let i = 0; i < path.getLength(); i++) {
          coords.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() });
        }
        setNewPolygonCoords(coords);
        setDrawMode(false);
        polygon.setMap(null); // We will redraw it through React state once saved
      });
    }

    const map = mapInstance.current;

    // Remove old overlays
    circleRefs.current.forEach(c => c.setMap(null)); circleRefs.current.clear();
    markerRefs.current.forEach(m => m.setMap(null)); markerRefs.current.clear();

    // Draw each zone
    zones.forEach(zone => {
      const cfg = RISK[zone.riskLevel] ?? RISK.LOW;
      const lat = zone.location.latitude;
      const lng = zone.location.longitude;
      const pop = zone.population || zone.location.population || 0;

      let baseShape: any;

      if (Array.isArray(zone.polygonCoordinates) && zone.polygonCoordinates.length > 2) {
        baseShape = new google.maps.Polygon({
          map, paths: zone.polygonCoordinates,
          fillColor: cfg.stroke, fillOpacity: 0.18,
          strokeColor: cfg.stroke, strokeOpacity: 0.85, strokeWeight: 2,
        });
      } else {
        // Radius proportional to population (min 600m, max 1500m)
        const radius = Math.min(1500, Math.max(600, Math.sqrt(pop) * 1.5));
        baseShape = new google.maps.Circle({
          map, center: { lat, lng }, radius,
          fillColor: cfg.stroke, fillOpacity: 0.18,
          strokeColor: cfg.stroke, strokeOpacity: 0.85, strokeWeight: 2,
        });
      }

      const svgIcon = `
        <svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>
          <style>
            @keyframes pulse {
              0% { r: 11; opacity: 0.95; }
              50% { r: 15; opacity: 0.5; }
              100% { r: 11; opacity: 0.95; }
            }
            .pulsating { animation: pulse 2s infinite ease-in-out; }
            @keyframes innerPulse {
              0% { r: 4; opacity: 0.9; }
              50% { r: 5; opacity: 1; }
              100% { r: 4; opacity: 0.9; }
            }
            .inner-dot { animation: innerPulse 2s infinite ease-in-out; }
          </style>
          <circle cx='20' cy='20' r='11' fill='${cfg.stroke}' opacity='0.95' class="pulsating" />
          <circle cx='20' cy='20' r='7'  fill='white' opacity='0.3' />
          <circle cx='20' cy='20' r='4'  fill='white' opacity='0.9' class="inner-dot" />
        </svg>`;

      const marker = new google.maps.Marker({
        map, position: { lat, lng }, title: zone.name,
        icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`, scaledSize: new google.maps.Size(40, 40), anchor: new google.maps.Point(20, 20) },
        zIndex: zone.riskLevel === 'CRITICAL' ? 200 : zone.riskLevel === 'HIGH' ? 150 : 100,
      });

      const score = zone.assessments[0]?.riskScore;
      const weather = zone.weatherSnapshot;

      const infoContent = `
        <div style="background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:12px;font-family:'Inter',sans-serif;min-width:210px;border:1px solid ${cfg.stroke}30">
          <div style="font-weight:700;font-size:14px;margin-bottom:3px;color:#fff">${zone.name}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:10px">${zone.location.county} Â· ${zone.code}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="background:${cfg.stroke}20;color:${cfg.stroke};border:1px solid ${cfg.stroke}40;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700">${zone.riskLevel}</span>
            ${score !== undefined ? `<span style="font-size:12px;color:#94a3b8">Score: <b style="color:#fff">${score.toFixed(1)}</b>/100</span>` : '<span style="font-size:11px;color:#475569">No score yet</span>'}
          </div>
          <div style="font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:4px;margin-bottom:6px">ðŸ‘¥ ${pop.toLocaleString()} people at risk</div>
          ${weather ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
              <div style="background:#1e293b;padding:6px 8px;border-radius:8px"><div style="font-size:10px;color:#64748b">ðŸŒ¡ Temp</div><div style="font-size:13px;font-weight:600;color:#fff">${weather.temperature.toFixed(1)}°C</div></div>
              <div style="background:#1e293b;padding:6px 8px;border-radius:8px"><div style="font-size:10px;color:#64748b">ðŸ’§ Humidity</div><div style="font-size:13px;font-weight:600;color:#fff">${weather.humidity.toFixed(0)}%</div></div>
              <div style="background:#1e293b;padding:6px 8px;border-radius:8px"><div style="font-size:10px;color:#64748b">ðŸŒ§ Rain</div><div style="font-size:13px;font-weight:600;color:#fff">${weather.precipitationIntensity.toFixed(1)} mm/hr</div></div>
              <div style="background:#1e293b;padding:6px 8px;border-radius:8px"><div style="font-size:10px;color:#64748b">ðŸ’¨ Wind</div><div style="font-size:13px;font-weight:600;color:#fff">${weather.windSpeed.toFixed(1)} m/s</div></div>
            </div>
          ` : `<div style="font-size:11px;color:#475569;margin-top:6px">No weather data Â· click Refresh Weather</div>`}
        </div>`;

      marker.addListener('click', () => {
        infoWin.current?.setContent(infoContent);
        infoWin.current?.open(map, marker);
        setSelected(zone);
      });

      baseShape.addListener('click', (e: any) => {
        infoWin.current?.setContent(infoContent);
        // Position info window roughly where they clicked, or center
        const clickPos = e?.latLng ?? { lat, lng };
        infoWin.current?.setPosition(clickPos);
        infoWin.current?.open(map);
        setSelected(zone);
      });

      circleRefs.current.set(zone.id, baseShape);
      markerRefs.current.set(zone.id, marker);
    });
  }, [mapsReady, zones]);

  /* â”€â”€ Toggle drawing mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (!drawingMgr.current) return;
    drawingMgr.current.setDrawingMode(
      drawMode ? google.maps.drawing.OverlayType.POLYGON : null
    );
  }, [drawMode]);

  /* â”€â”€ Pan to selected zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (!selected || !mapInstance.current) return;
    mapInstance.current.panTo({ lat: selected.location.latitude, lng: selected.location.longitude });
    mapInstance.current.setZoom(14);
  }, [selected]);

  /* â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const critical = zones.filter(z => z.riskLevel === 'CRITICAL').length;
  const high = zones.filter(z => z.riskLevel === 'HIGH').length;
  const totalPop = zones.reduce((s, z) => s + (z.population || z.location.population || 0), 0);
  const zonesWithScore = zones.filter(z => z.assessments[0]);
  const avgScore = zonesWithScore.length > 0
    ? (zonesWithScore.reduce((s, z) => s + z.assessments[0].riskScore, 0) / zonesWithScore.length).toFixed(1)
    : null;

  /* â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden h-full">

      {/* â”€â”€ Topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <HeaderMotion className="flex flex-shrink-0 flex-col gap-4 border-b border-slate-800/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Flood Zone Intelligence</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live flood risk monitoring, weather intelligence, and mapped response infrastructure for Nairobi operations.
            {lastUpdate && <span className="ml-2 text-slate-600">Updated {lastUpdate}</span>}
          </p>
          {loadError && <p className="mt-2 text-xs text-red-400">{loadError}</p>}
          {actionError && <p className="mt-2 text-xs text-orange-400">{actionError}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveBadge label="Live" />
          {isAdmin && (
            <button
              onClick={() => setDrawMode(d => !d)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${drawMode
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-500 text-white hover:from-orange-400 hover:to-orange-500'
                }`}
            >
              {drawMode ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {drawMode ? 'Cancel Drawing' : 'Add Zone'}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={runIngest}
              disabled={ingesting}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              title="Refresh all active flood-zone weather snapshots"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
              {ingesting ? 'Fetching…' : 'Refresh All Weather'}
            </button>
          )}
        </div>
      </HeaderMotion>

      {/* â”€â”€ Stat strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 gap-0 border-b border-slate-800/60 flex-shrink-0 lg:grid-cols-4">
        {[
          { label: 'Critical', value: critical, color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'High Risk', value: high, color: 'text-orange-400', icon: <Activity className="w-4 h-4" /> },
          { label: 'Population at Risk', value: totalPop > 0 ? compactNumber.format(totalPop) : '-', color: 'text-blue-400', icon: <Users className="w-4 h-4" /> },
          { label: 'Avg Risk Score', value: avgScore ?? 'No data', color: 'text-yellow-400', icon: <Zap className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 border-r border-slate-800/60 px-4 py-3 last:border-r-0 sm:px-6">
            <div className={s.color}>{s.icon}</div>
            <div>
              <p className={`text-xl font-bold ${s.color} leading-none`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* â”€â”€ Main content: map + sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">

        {/* Map */}
        <div className="relative h-[52vh] flex-1 lg:h-auto">
          {loading && (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            </div>
          )}
          {!API_KEY && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600">
              <AlertTriangle className="w-10 h-10" />
              <p className="text-sm">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set</p>
            </div>
          )}
          {loadError && !loading && (
            <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center z-10 px-6">
              <div className="max-w-md text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white">Flood map data unavailable</p>
                <p className="text-xs text-slate-400 mt-2">{loadError}</p>
                <button
                  onClick={fetchZones}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />

          {/* Legend overlay */}
          <div className="absolute bottom-6 left-4 bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl px-4 py-3 z-10">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Risk Level</p>
            {Object.entries(RISK).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 mb-1 last:mb-0">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.stroke }} />
                <span className="text-xs text-slate-400">{v.label}</span>
              </div>
            ))}
          </div>

          {/* Zone count badge */}
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-full px-3 py-1 z-10 flex items-center gap-2">
            <MapPin className="w-3 h-3 text-orange-400" />
            <span className="text-xs text-slate-300 font-medium">{zones.length} zones monitored</span>
          </div>
        </div>

        {/* â”€â”€ Right sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex h-[48vh] w-full flex-col overflow-hidden border-t border-slate-800/60 lg:h-auto lg:w-80 lg:border-l lg:border-t-0">
          <AnimatePresence mode="wait">
            {selected ? (
              /* â”€â”€ DETAIL PANEL â€“ lives entirely inside sidebar with single scroll â”€â”€ */
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="flex flex-col h-full"
              >
                {/* Panel header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800/60 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${(RISK[selected.riskLevel] ?? RISK.LOW).dot} animate-pulse`} />
                    <div className="min-w-0">
                      <h2 className="font-bold text-white text-sm truncate">{selected.name}</h2>
                      <p className="text-xs text-slate-500">{selected.location.county} - {selected.code}</p>
                    </div>
                    <Badge className={`${(RISK[selected.riskLevel] ?? RISK.LOW).badge} border text-xs ml-1 flex-shrink-0`}>{selected.riskLevel}</Badge>
                  </div>
                  <button
                    onClick={() => { setSelected(null); mapInstance.current?.setZoom(12); mapInstance.current?.panTo(NAIROBI); }}
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0 ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Refresh weather row */}
                {canRefreshZoneWeather && (
                  <div className="px-4 py-2 border-b border-slate-800/40 flex-shrink-0">
                    <button
                      onClick={() => refreshZoneWeather(selected)}
                      disabled={zoneRefreshing === selected.id}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-all disabled:opacity-50"
                      title="Refresh this zone weather snapshot"
                    >
                      <RefreshCw className={`w-3 h-3 ${zoneRefreshing === selected.id ? 'animate-spin' : ''}`} />
                      Refresh Weather
                    </button>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800/60 flex-shrink-0">
                  {(isAdmin ? ['details', 'weather', 'nearby', 'admin'] as const : ['details', 'weather', 'nearby'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all capitalize ${activeTab === tab
                        ? 'border-orange-500 text-orange-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab content â€” ONLY scroll container, no fixed height */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4">

                  {/* Details tab */}
                  {activeTab === 'details' && (
                    <div className="space-y-3">
                      {canViewAiSummary && (
                        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-slate-900/95 to-slate-900/95 p-4 sm:p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/80">AI Risk Brief</p>
                              <p className="mt-1 text-sm text-slate-300">Operational summary for flood-response coordination.</p>
                            </div>
                            <button
                              onClick={() => fetchAiSummary(selected.id, true)}
                              disabled={aiSummaryLoading === selected.id}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:opacity-60 sm:w-auto"
                            >
                              <RefreshCw className={`h-3 w-3 ${aiSummaryLoading === selected.id ? 'animate-spin' : ''}`} />
                              Refresh
                            </button>
                          </div>

                          {aiSummaryLoading === selected.id && !selectedAiSummary ? (
                            <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                              <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                              Preparing AI risk brief...
                            </div>
                          ) : selectedAiSummary ? (
                            <div className="mt-4 space-y-3">
                              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
                                <p className="text-sm leading-6 text-slate-100">{selectedAiSummary.summary}</p>
                              </div>
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <div className="grid min-h-[100px] grid-rows-[auto_1fr] rounded-xl bg-slate-900/70 p-3 md:min-w-0">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Confidence</p>
                                  </div>
                                  <div className="flex items-end">
                                    <div>
                                      <p className="text-lg font-semibold leading-none text-white">{(selectedAiSummary.confidence * 100).toFixed(0)}%</p>
                                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-transparent select-none">mm/hr</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid min-h-[100px] grid-rows-[auto_1fr] rounded-xl bg-slate-900/70 p-3 md:min-w-0">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Risk score</p>
                                  </div>
                                  <div className="flex items-end">
                                    <div>
                                      <p className="text-lg font-semibold leading-none text-white">
                                        {selectedAiSummary.context.riskScore !== null
                                          ? selectedAiSummary.context.riskScore.toFixed(1)
                                          : 'N/A'}
                                      </p>
                                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-transparent select-none">mm/hr</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid min-h-[100px] grid-rows-[auto_1fr] rounded-xl bg-slate-900/70 p-3 md:min-w-0">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Rain intensity</p>
                                  </div>
                                  <div className="flex items-end">
                                    {selectedAiSummary.context.precipitationIntensity !== null ? (
                                      <div>
                                        <p className="text-lg font-semibold leading-none text-white">
                                          {selectedAiSummary.context.precipitationIntensity.toFixed(1)}
                                        </p>
                                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">mm/hr</p>
                                      </div>
                                    ) : (
                                      <p className="text-lg font-semibold leading-none text-white">N/A</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">
                                <p className="text-xs font-semibold text-slate-300">Recommended actions</p>
                                <div className="mt-2 space-y-2">
                                  {selectedAiSummary.recommendations.map((recommendation, index) => (
                                    <div key={`${selected.id}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-slate-300">
                                      <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                                      <p>{recommendation}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Generated {new Date(selectedAiSummary.generatedAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}.
                                Use this as decision support and keep human approval in the loop.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/40 p-3 text-sm text-slate-400">
                              Select refresh to generate an AI risk brief for this flood zone.
                            </div>
                          )}

                          {aiSummaryError && (
                            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                              {aiSummaryError}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { label: 'Population', value: (selected.population || selected.location.population || 0).toLocaleString(), color: 'text-blue-400', icon: <Users className="w-4 h-4" /> },
                          { label: 'River Proximity', value: selected.riverProximityKm ? `${selected.riverProximityKm} km` : '-', color: 'text-cyan-400', icon: <Droplets className="w-4 h-4" /> },
                          { label: 'Drainage Score', value: `${selected.drainageScore}/100`, color: 'text-yellow-400', icon: <Activity className="w-4 h-4" /> },
                          { label: 'Historical Risk', value: `${selected.historicalFloodScore}/100`, color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> },
                          { label: 'Elevation', value: selected.elevationM ? `${selected.elevationM}m` : '-', color: 'text-green-400', icon: <MapPin className="w-4 h-4" /> },
                          { label: 'Risk Score', value: selected.assessments[0] ? `${selected.assessments[0].riskScore.toFixed(1)}/100` : 'None', color: 'text-orange-400', icon: <Zap className="w-4 h-4" /> },
                          { label: 'Risk Data', value: selected.riskDataFresh ? 'Fresh' : 'Stale', color: selected.riskDataFresh ? 'text-green-400' : 'text-amber-400', icon: <Activity className="w-4 h-4" /> },
                          { label: 'County', value: selected.location.county, color: 'text-slate-300', icon: <MapPin className="w-4 h-4" /> },
                          { label: 'Status', value: selected.isActive ? 'Active' : 'Inactive', color: selected.isActive ? 'text-green-400' : 'text-slate-500', icon: <Shield className="w-4 h-4" /> },
                        ].map(d => (
                          <div key={d.label} className="bg-slate-800/40 rounded-xl p-3">
                            <div className={`flex items-center gap-1.5 mb-1 ${d.color}`}>{d.icon}<p className="text-xs text-slate-500">{d.label}</p></div>
                            <p className={`text-base font-bold ${d.color}`}>{d.value}</p>
                          </div>
                        ))}
                        {selected.assessments[0] && (
                          <div className="bg-slate-800/40 rounded-xl p-3 sm:col-span-2">
                            <p className="text-xs text-slate-400 mb-2 font-semibold">Risk Score Breakdown</p>
                            {[ 
                              { label: 'Current Rain', value: selected.assessments[0].rainfallScore ?? 0, color: 'bg-blue-500' },
                              { label: 'Accumulation', value: selected.assessments[0].accumulationScore ?? 0, color: 'bg-sky-500' },
                              { label: 'Forecast', value: selected.assessments[0].forecastScore ?? 0, color: 'bg-indigo-500' },
                              { label: 'River', value: selected.assessments[0].riverScore ?? 0, color: 'bg-cyan-500' },
                              { label: 'Drainage', value: selected.assessments[0].drainageScore ?? 0, color: 'bg-yellow-500' },
                              { label: 'Data Quality', value: selected.assessments[0].dataQualityScore ?? 0, color: 'bg-emerald-500' },
                            ].map(b => (
                              <div key={b.label} className="mb-2">
                                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{b.label}</span><span>{b.value.toFixed(1)}</span></div>
                                <div className="w-full bg-slate-700/40 rounded-full h-1.5">
                                  <div className={`${b.color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(100, b.value)}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weather tab */}
                  {activeTab === 'weather' && (
                    <div>
                      {selected.weatherSnapshot ? (
                        <div>
                          {!selected.weatherDataFresh && (
                            <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                              <p className="text-xs font-semibold text-amber-400">Weather snapshot is stale</p>
                              <p className="mt-1 text-xs text-slate-400">Refresh this zone before using the weather values for operational decisions.</p>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 mb-1">
                            Signal Agreement: <span className="text-white font-semibold">{(selected.weatherSnapshot.confidenceScore * 100).toFixed(0)}%</span> -
                            Updated: <span className="text-white">{new Date(selected.weatherSnapshot.snapshotAt).toLocaleTimeString()}</span>
                          </p>
                          <p className="text-xs text-slate-500 mb-1">{getProviderAgreementNote(selected.weatherSnapshot)}</p>
                          <p className="text-xs text-slate-500 mb-3">
                            Operational Confidence: <span className="text-white font-semibold">
                              {(() => {
                                const operationalConfidence = getOperationalConfidence(selected.weatherSnapshot);
                                return operationalConfidence === null ? '--' : `${(operationalConfidence * 100).toFixed(0)}%`;
                              })()}
                            </span>
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Temperature', value: `${selected.weatherSnapshot.temperature.toFixed(1)}°C`, color: 'text-orange-400', icon: <Thermometer className="w-4 h-4" />, bg: 'bg-orange-500/10' },
                              { label: 'Humidity', value: `${selected.weatherSnapshot.humidity.toFixed(0)}%`, color: 'text-blue-400', icon: <Droplets className="w-4 h-4" />, bg: 'bg-blue-500/10' },
                              { label: 'Rain Intensity (Now)', value: `${selected.weatherSnapshot.precipitationIntensity.toFixed(2)} mm/hr`, color: 'text-cyan-400', icon: <Cloud className="w-4 h-4" />, bg: 'bg-cyan-500/10' },
                              { label: getRainProbabilityLabel(selected.weatherSnapshot), value: `${selected.weatherSnapshot.precipitationProbability.toFixed(0)}%`, color: 'text-purple-400', icon: <Cloud className="w-4 h-4" />, bg: 'bg-purple-500/10' },
                              { label: 'Wind Speed', value: `${selected.weatherSnapshot.windSpeed.toFixed(1)} m/s`, color: 'text-green-400', icon: <Wind className="w-4 h-4" />, bg: 'bg-green-500/10' },
                            ].map(w => (
                              <div key={w.label} className={`${w.bg} border border-slate-700/40 rounded-xl p-3`}>
                                <div className={`${w.color} mb-1`}>{w.icon}</div>
                                <p className={`text-lg font-bold ${w.color}`}>{w.value}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{w.label}</p>
                              </div>
                            ))}
                            {selected.weatherSnapshot.precipitationIntensity > 10 && (
                              <div className="col-span-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-red-400">Elevated Flood Risk</p>
                                  <p className="text-xs text-slate-400 mt-0.5">Rain {selected.weatherSnapshot.precipitationIntensity.toFixed(2)} mm/hr exceeds threshold.</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-900/50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recent Rainfall</p>
                              <p className="text-[11px] text-slate-500">From provider payloads when available</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {(() => {
                                const rainfall = getMergedDerivedMetrics(selected.weatherSnapshot);

                                return [
                                  { label: 'Last 1h', value: rainfall.rainLast1h },
                                  { label: 'Last 3h', value: rainfall.rainLast3h },
                                  { label: 'Last 24h', value: rainfall.rainLast24h },
                                ].map((item) => (
                                  <div key={item.label} className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-3">
                                    <p className="text-xs text-slate-500">{item.label}</p>
                                    <p className="mt-1 text-base font-semibold text-slate-100">
                                      {item.value === null ? '--' : `${item.value.toFixed(2)} mm`}
                                    </p>
                                  </div>
                                ));
                              })()}
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500">
                              Recent accumulation is shown when at least one provider supplies enough data. Flooding can continue after `Rain Intensity (Now)` falls to 0.00 mm/hr.
                            </p>
                          </div>
                          <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-900/50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Forecast Rain</p>
                              <p className="text-[11px] text-slate-500">Upcoming precipitation that can worsen runoff</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {(() => {
                                const rainfall = getMergedDerivedMetrics(selected.weatherSnapshot);

                                return [
                                  { label: 'Next 6h', value: rainfall.forecastRainNext6h, suffix: 'mm' },
                                  { label: 'Next 24h', value: rainfall.forecastRainNext24h, suffix: 'mm' },
                                  { label: 'Max Rain Chance 6h', value: rainfall.forecastProbabilityMaxNext6h, suffix: '%' },
                                  { label: 'Max Rain Chance 24h', value: rainfall.forecastProbabilityMaxNext24h, suffix: '%' },
                                ].map((item) => (
                                  <div key={item.label} className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-3">
                                    <p className="text-xs text-slate-500">{item.label}</p>
                                    <p className="mt-1 text-base font-semibold text-slate-100">
                                      {item.value === null ? '--' : `${item.value.toFixed(2)} ${item.suffix}`}
                                    </p>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Cloud className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm mb-3">No fresh weather data is available for this zone.</p>
                          {canRefreshZoneWeather && (
                            <button onClick={() => refreshZoneWeather(selected)} className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-sm hover:bg-orange-500/20 transition-all">
                              Fetch Weather Now
                            </button>
                          )}
                          {actionError && (
                            <p className="mt-3 text-xs text-orange-400">{actionError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nearby tab */}
                  {activeTab === 'nearby' && (
                    <div>
                      <div className="mb-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-3">
                        <p className="text-xs font-semibold text-white">Nearby infrastructure and response points</p>
                        <p className="mt-1 text-xs text-slate-400">This panel prioritizes live nearby results and falls back to verified Flood Guard infrastructure if needed.</p>
                      </div>
                      {nearbyLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
                          <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                          <span className="text-sm">Searching within 5km...</span>
                        </div>
                      ) : nearby.length === 0 ? (
                        <p className="text-center py-8 text-slate-500 text-sm">No nearby infrastructure found yet for this zone.</p>
                      ) : (
                        <div className="space-y-4">
                          {nearby.filter(g => g.places.length > 0).map(group => (
                            <div key={group.type}>
                              <div className="flex items-center gap-2 mb-2">
                                {PLACE_ICONS[group.label] ?? <MapPin className="w-4 h-4 text-slate-400" />}
                                <p className="text-sm font-semibold text-white">{group.label}</p>
                                <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">{group.places.length}</span>
                              </div>
                              <div className="space-y-1.5">
                                {group.places.map(p => (
                                  <div key={p.id} className="flex items-start gap-2 p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{p.name}</p>
                                      <p className="text-xs text-slate-500 truncate">{p.address}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                      {p.rating && <span className="text-xs text-yellow-400">Star {p.rating}</span>}
                                      {p.open !== null && <span className={`text-xs ${p.open ? 'text-green-400' : 'text-red-400'}`}>{p.open ? 'Open' : 'Closed'}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin tab */}
                  {activeTab === 'admin' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-widest">Update Risk Level</p>
                        <div className="flex gap-2 flex-wrap">
                          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
                            <button
                              key={level}
                              onClick={async () => {
                                await fetch(`/api/flood-zones/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ riskLevel: level }) });
                                await fetchZones();
                                setSelected(z => z ? { ...z, riskLevel: level } : z);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selected.riskLevel === level ? `${RISK[level].badge} border-current` : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-white">Zone Active</p>
                          <p className="text-xs text-slate-500">Inactive zones won&apos;t trigger alerts</p>
                        </div>
                        <button
                          onClick={async () => {
                            await fetch(`/api/flood-zones/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !selected.isActive }) });
                            await fetchZones();
                            setSelected(z => z ? { ...z, isActive: !z.isActive } : z);
                          }}
                          className={`w-11 h-6 rounded-full transition-all ${selected.isActive ? 'bg-orange-500' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${selected.isActive ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>

                      <div className="p-3 bg-slate-800/40 rounded-xl">
                        <p className="text-sm font-semibold text-white mb-1">Polygon</p>
                        <p className="text-xs text-slate-500">{Array.isArray(selected.polygonCoordinates) && selected.polygonCoordinates.length > 2 ? `Custom polygon - ${selected.polygonCoordinates.length} points` : 'Using auto-circle (no polygon drawn yet). Use Add Zone to draw one.'}</p>
                      </div>

                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-sm font-semibold text-red-400 mb-1">Danger Zone</p>
                        <p className="text-xs text-slate-500 mb-3">Permanently delete this zone. Irreversible.</p>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete "${selected.name}"?`)) return;
                            await fetch(`/api/flood-zones/${selected.id}`, { method: 'DELETE' });
                            setSelected(null);
                            infoWin.current?.close();
                            await fetchZones();
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-semibold border border-red-500/30 transition-all w-full justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Flood Zone
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* â”€â”€ ZONE LIST â”€â”€ */
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <div className="px-4 py-3 border-b border-slate-800/50 flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Zones ({zones.length})</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-orange-400 animate-spin" /></div>
                  ) : loadError ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-slate-400">Live flood zone data could not be loaded.</p>
                    </div>
                  ) : zones.map(zone => {
                    const cfg = RISK[zone.riskLevel] ?? RISK.LOW;
                    const score = zone.assessments[0]?.riskScore;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setSelected(zone)}
                        className="w-full text-left px-4 py-3 border-b border-slate-800/40 transition-all hover:bg-slate-800/40"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <p className="text-sm font-semibold text-white truncate max-w-[160px]">{zone.name}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                        <div className="flex items-center justify-between pl-4">
                          <p className="text-xs text-slate-500">{(zone.population || zone.location.population || 0).toLocaleString()} people</p>
                          {score !== undefined
                            ? <span className={`text-xs font-bold ${score >= 70 ? 'text-red-400' : score >= 50 ? 'text-orange-400' : score >= 30 ? 'text-yellow-400' : 'text-green-400'}`}>{score.toFixed(1)}</span>
                            : <span className="text-xs text-slate-600">No score</span>
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* â”€â”€ Save Zone Modal â”€â”€ */}
      <AnimatePresence>
        {newPolygonCoords && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/20">
                <h3 className="font-bold text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-400" /> Save New Flood Zone</h3>
                <button onClick={() => setNewPolygonCoords(null)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Zone Name</label>
                  <input value={newZoneForm.name} onChange={e => setNewZoneForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kibera River Basin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-medium">Unique Code</label>
                    <input value={newZoneForm.code} onChange={e => setNewZoneForm(f => ({ ...f, code: e.target.value }))} placeholder="NBI-FZ-09"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-medium">County</label>
                    <input value={newZoneForm.county} onChange={e => setNewZoneForm(f => ({ ...f, county: e.target.value }))} placeholder="e.g. Nairobi"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Est. Population at Risk</label>
                  <input type="number" value={newZoneForm.population} onChange={e => setNewZoneForm(f => ({ ...f, population: e.target.value }))} placeholder="50000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50" />
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Once saved, the weather engine will automatically locate the closest weather cell and begin risk assessments for this polygon.</p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-800/10 flex justify-end gap-3">
                <button onClick={() => setNewPolygonCoords(null)} className="px-4 py-2 text-slate-400 hover:text-white font-medium text-sm transition">Cancel</button>
                <button onClick={saveNewZone} disabled={savingZone || !newZoneForm.name || !newZoneForm.code}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                  {savingZone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {savingZone ? 'Saving...' : 'Save Zone Configuration'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
