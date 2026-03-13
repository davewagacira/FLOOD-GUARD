// GET /api/flood-zones/[id]/nearby
// Returns authoritative nearby infrastructure from the local database

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/server-auth";

const SEARCH_RADIUS_KM = 5;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
            .filter((item) => item.distanceKm <= SEARCH_RADIUS_KM)
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 5)
            .map(({ distanceKm, ...place }) => ({
                ...place,
                address: `${place.address}${place.address ? " • " : ""}${distanceKm.toFixed(1)} km away`,
            }));

    const nearby = [
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
    ];

    return NextResponse.json({ zoneId: params.id, lat, lng, nearby });
}
