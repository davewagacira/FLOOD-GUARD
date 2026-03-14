// GET /api/flood-zones/[id]/nearby
// Returns nearby infrastructure, prioritizing live Google Places data.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/server-auth";

const INITIAL_RADIUS_METERS = 5000;
const FALLBACK_RADII_METERS = [5000, 8000, 12000, 18000];
const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

type NearbyPlace = {
    id: string;
    name: string;
    address: string;
    rating: number | null;
    lat: number;
    lng: number;
    open: boolean | null;
    distanceKm: number;
};

type NearbyGroup = {
    type: string;
    label: string;
    emoji: string;
    places: Array<Omit<NearbyPlace, "distanceKm">>;
};

type GooglePlacesResponse = {
    places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        location?: { latitude?: number; longitude?: number };
        regularOpeningHours?: { openNow?: boolean };
    }>;
};

const GOOGLE_PLACES_GROUPS: Array<{
    type: string;
    label: string;
    emoji: string;
    includedTypes: string[];
}> = [
    { type: "hospital", label: "Hospital", emoji: "hospital", includedTypes: ["hospital"] },
    { type: "shelter", label: "Shelter", emoji: "shelter", includedTypes: ["school", "community_center", "stadium"] },
    { type: "safe_zone", label: "Safe Zone", emoji: "safe-zone", includedTypes: ["community_center", "school", "church", "mosque"] },
    { type: "rescue_resource", label: "Rescue Resource", emoji: "rescue", includedTypes: ["fire_station", "police"] },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPlaceAddress(baseAddress: string, distanceKm: number) {
    return `${baseAddress}${baseAddress ? " • " : ""}${distanceKm.toFixed(1)} km away`;
}

function dedupePlaces(places: NearbyPlace[]) {
    const seen = new Set<string>();
    return places.filter((place) => {
        const key = `${place.name.toLowerCase()}::${place.lat.toFixed(5)}::${place.lng.toFixed(5)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function finalizePlaces(places: NearbyPlace[]) {
    return dedupePlaces(places)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5)
        .map(({ distanceKm, ...place }) => ({
            ...place,
            address: formatPlaceAddress(place.address, distanceKm),
        }));
}

async function fetchGooglePlaces(params: {
    apiKey: string;
    lat: number;
    lng: number;
    radiusMeters: number;
    includedTypes: string[];
}) {
    const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": params.apiKey,
            "X-Goog-FieldMask": [
                "places.id",
                "places.displayName",
                "places.formattedAddress",
                "places.rating",
                "places.location",
                "places.regularOpeningHours.openNow",
            ].join(","),
        },
        body: JSON.stringify({
            includedTypes: params.includedTypes,
            maxResultCount: 8,
            rankPreference: "DISTANCE",
            languageCode: "en",
            regionCode: "KE",
            locationRestriction: {
                circle: {
                    center: { latitude: params.lat, longitude: params.lng },
                    radius: params.radiusMeters,
                },
            },
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`Google Places search failed (${response.status}): ${details || response.statusText}`);
    }

    const payload = (await response.json()) as GooglePlacesResponse;
    return (payload.places ?? [])
        .map((place) => {
            const placeLat = place.location?.latitude;
            const placeLng = place.location?.longitude;
            if (typeof placeLat !== "number" || typeof placeLng !== "number") return null;
            return {
                id: place.id ?? `${place.displayName?.text ?? "place"}-${placeLat}-${placeLng}`,
                name: place.displayName?.text ?? "Unnamed place",
                address: place.formattedAddress ?? "Google Places result",
                rating: typeof place.rating === "number" ? place.rating : null,
                lat: placeLat,
                lng: placeLng,
                open: typeof place.regularOpeningHours?.openNow === "boolean" ? place.regularOpeningHours.openNow : null,
                distanceKm: haversineKm(params.lat, params.lng, placeLat, placeLng),
            } satisfies NearbyPlace;
        })
        .filter((place): place is NearbyPlace => place !== null);
}

async function buildGooglePlacesNearby(params: { apiKey: string; lat: number; lng: number }) {
    const groups: NearbyGroup[] = [];

    for (const group of GOOGLE_PLACES_GROUPS) {
        let foundPlaces: NearbyPlace[] = [];

        for (const radiusMeters of FALLBACK_RADII_METERS) {
            const places = await fetchGooglePlaces({
                apiKey: params.apiKey,
                lat: params.lat,
                lng: params.lng,
                radiusMeters,
                includedTypes: group.includedTypes,
            });

            foundPlaces = dedupePlaces([...foundPlaces, ...places]);
            if (foundPlaces.length >= 3 || radiusMeters === FALLBACK_RADII_METERS[FALLBACK_RADII_METERS.length - 1]) {
                break;
            }
        }

        groups.push({
            type: group.type,
            label: group.label,
            emoji: group.emoji,
            places: finalizePlaces(foundPlaces),
        });
    }

    return groups;
}

async function buildDatabaseNearby(params: { lat: number; lng: number }) {
    const { lat, lng } = params;
    const searchRadiusKm = INITIAL_RADIUS_METERS / 1000;
    const [shelters, safeZones, hospitals, resources] = await Promise.all([
        prisma.shelter.findMany({ where: { isActive: true } }),
        prisma.safeZone.findMany({ where: { isActive: true } }),
        prisma.hospital.findMany(),
        prisma.rescueResource.findMany({ where: { isAvailable: true, latitude: { not: null }, longitude: { not: null } } }),
    ]);

    const toPlaces = <T extends { id: string; name: string; latitude: number; longitude: number }>(
        items: T[],
        addressFor: (item: T) => string,
    ) =>
        finalizePlaces(
            items
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    address: addressFor(item),
                    rating: null,
                    lat: item.latitude,
                    lng: item.longitude,
                    open: true,
                    distanceKm: haversineKm(lat, lng, item.latitude, item.longitude),
                }))
                .filter((item) => item.distanceKm <= searchRadiusKm),
        );

    return [
        {
            type: "hospital",
            label: "Hospital",
            emoji: "hospital",
            places: toPlaces(hospitals, (hospital) => hospital.address ?? "Emergency medical facility"),
        },
        {
            type: "shelter",
            label: "Shelter",
            emoji: "shelter",
            places: toPlaces(shelters, (shelter) => shelter.address ?? `Capacity ${shelter.capacity}`),
        },
        {
            type: "safe_zone",
            label: "Safe Zone",
            emoji: "safe-zone",
            places: toPlaces(safeZones, (safeZone) => `Capacity ${safeZone.capacity ?? "unknown"}`),
        },
        {
            type: "rescue_resource",
            label: "Rescue Resource",
            emoji: "rescue",
            places: toPlaces(
                resources
                    .filter((resource): resource is typeof resource & { latitude: number; longitude: number } => resource.latitude !== null && resource.longitude !== null)
                    .map((resource) => ({ ...resource, latitude: resource.latitude!, longitude: resource.longitude! })),
                (resource) => resource.contactPhone ?? "Dispatch-ready resource",
            ),
        },
    ] satisfies NearbyGroup[];
}

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> },
) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const params = await props.params;

    const zone = await prisma.floodZone.findUnique({
        where: { id: params.id },
        include: { location: { select: { latitude: true, longitude: true } } },
    });

    if (!zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });

    const { latitude: lat, longitude: lng } = zone.location;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    try {
        if (apiKey) {
            const nearby = await buildGooglePlacesNearby({ apiKey, lat, lng });
            return NextResponse.json({
                zoneId: params.id,
                lat,
                lng,
                source: "google_places",
                nearby,
            });
        }
    } catch (error) {
        console.error("[GET /api/flood-zones/[id]/nearby] Google Places failed, falling back to database.", error);
    }

    const nearby = await buildDatabaseNearby({ lat, lng });
    return NextResponse.json({
        zoneId: params.id,
        lat,
        lng,
        source: "database",
        nearby,
    });
}
