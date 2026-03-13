// GET /api/ai/test — Smoke test for Vertex AI connectivity
// Remove this route before production deployment
import { NextResponse } from "next/server";
import { analyzeFloodRisk } from "@/lib/ai/vertex";

export async function GET() {
    try {
        const result = await analyzeFloodRisk({
            zoneName: "Kibera Flood Zone",
            riskLevel: "CRITICAL",
            riskScore: 87,
            precipitationMm: 45,
            riverProximityKm: 0.3,
            drainageScore: 15,
            historicalFloodScore: 95,
            populationAtRisk: 350000,
        });

        return NextResponse.json({
            success: true,
            model: "gemini-2.0-flash-001",
            project: process.env.GOOGLE_CLOUD_PROJECT_ID,
            location: process.env.VERTEX_AI_LOCATION,
            result,
        });
    } catch (err) {
        return NextResponse.json(
            {
                success: false,
                error: err instanceof Error ? err.message : "Unknown error",
                hint: "Check GOOGLE_APPLICATION_CREDENTIALS path and GOOGLE_CLOUD_PROJECT_ID",
            },
            { status: 500 }
        );
    }
}
