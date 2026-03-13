// POST /api/weather/ingest
// Triggers weather ingestion for all active flood zones
// Protected by CRON_SECRET header

import { NextRequest, NextResponse } from "next/server";
import { ingestWeatherForAllLocations } from "@/server/services/weather.service";
import { requireRole } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
    const auth = await requireRole(req, ["ADMIN"]);
    if (auth.error) return auth.error;

    try {
        console.log("[WeatherIngest] Starting ingestion...");
        const result = await ingestWeatherForAllLocations();

        console.log(`[WeatherIngest] Done: ${result.processed} processed, ${result.failed} failed`);
        if (result.highRiskZones.length > 0) {
            console.warn("[WeatherIngest] High risk zones:", result.highRiskZones);
        }

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[WeatherIngest] Ingestion failed:", err);
        return NextResponse.json(
            { error: "Weather ingestion failed", details: String(err) },
            { status: 500 }
        );
    }
}

// Also handle GET for Vercel Cron compatibility
export async function GET(req: NextRequest) {
    return POST(req);
}
