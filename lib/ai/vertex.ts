/**
 * Vertex AI Client - FloodGuard Platform
 *
 * Initializes the Google Vertex AI SDK using service account credentials.
 * Used for flood risk prediction, weather pattern analysis, and
 * AI-assisted disaster response recommendations.
 */

import { VertexAI, HarmBlockThreshold, HarmCategory } from "@google-cloud/vertexai";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID!;
const LOCATION = process.env.VERTEX_AI_LOCATION ?? "us-central1";

const globalForVertex = globalThis as unknown as { vertex: VertexAI | undefined };

export const vertex: VertexAI =
    globalForVertex.vertex ??
    new VertexAI({
        project: PROJECT_ID,
        location: LOCATION,
    });

if (process.env.NODE_ENV !== "production") {
    globalForVertex.vertex = vertex;
}

export function getGenerativeModel(model = "gemini-2.0-flash-001") {
    return vertex.getGenerativeModel({
        model,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
        generationConfig: {
            temperature: 0.35,
            topP: 0.85,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
        },
    });
}

export interface FloodRiskAiParams {
    zoneName: string;
    county: string;
    subCounty?: string | null;
    ward?: string | null;
    riskLevel: string;
    riskScore: number;
    precipitationMm: number;
    precipitationProbability?: number | null;
    rainLast1h?: number | null;
    rainLast3h?: number | null;
    rainLast24h?: number | null;
    forecastRainNext6h?: number | null;
    forecastRainNext24h?: number | null;
    forecastProbabilityMaxNext6h?: number | null;
    forecastProbabilityMaxNext24h?: number | null;
    operationalConfidence?: number | null;
    dataFreshness?: "fresh" | "stale" | "unknown";
    riverProximityKm: number | null;
    drainageScore: number;
    historicalFloodScore: number;
    populationAtRisk: number;
    rainfallScore?: number | null;
    accumulationScore?: number | null;
    forecastScore?: number | null;
    riverScore?: number | null;
    drainageRiskScore?: number | null;
    dataQualityScore?: number | null;
}

function formatMetric(value: number | null | undefined, suffix = "") {
    if (value === null || value === undefined || Number.isNaN(value)) return "Unavailable";
    return `${value.toFixed(1)}${suffix}`;
}

function buildLocationLabel(params: FloodRiskAiParams) {
    return [params.zoneName, params.ward, params.subCounty, params.county].filter(Boolean).join(", ");
}

function buildDeterministicRecommendations(params: FloodRiskAiParams) {
    const recommendations: string[] = [];

    if ((params.rainLast3h ?? 0) >= 20 || (params.rainLast24h ?? 0) >= 60) {
        recommendations.push("Move teams toward low-lying corridors and inspect known drainage chokepoints before runoff worsens.");
    }

    if ((params.forecastRainNext6h ?? 0) >= 15 || (params.forecastProbabilityMaxNext6h ?? 0) >= 70) {
        recommendations.push("Prepare a pre-emptive resident warning for the next few hours and brief response leads on likely escalation.");
    }

    if ((params.riverProximityKm ?? 99) <= 0.5) {
        recommendations.push("Prioritize river-adjacent settlements, bridges, and crossing points for patrols and movement guidance.");
    }

    if (params.drainageScore <= 35) {
        recommendations.push("Coordinate rapid checks on blocked drains, culverts, and road runoff points because drainage weakness is a key driver here.");
    }

    if (params.populationAtRisk >= 100000) {
        recommendations.push("Stage shelter, triage, and communication capacity for a high-volume incident because population exposure is significant.");
    }

    if ((params.operationalConfidence ?? 1) < 0.6 || params.dataFreshness === "stale") {
        recommendations.push("Verify the latest zone weather snapshot before making high-impact decisions because the available data confidence is limited.");
    }

    if (recommendations.length < 3 && params.riskLevel === "CRITICAL") {
        recommendations.push("Escalate to full response posture with immediate coordination across rescue, shelter, and resident messaging teams.");
    }

    if (recommendations.length < 3 && params.riskLevel === "HIGH") {
        recommendations.push("Keep teams in ready posture and shorten review cycles for incidents, distress signals, and outbound alerts.");
    }

    if (recommendations.length < 3 && params.riskLevel === "MEDIUM") {
        recommendations.push("Sustain close monitoring and pre-stage communications so the zone can be escalated quickly if conditions change.");
    }

    if (recommendations.length < 3) {
        recommendations.push("Maintain monitoring, validate new distress reports quickly, and keep escalation pathways ready.");
    }

    return recommendations.slice(0, 4);
}

function buildDeterministicSummary(params: FloodRiskAiParams) {
    const locationLabel = buildLocationLabel(params);
    const rainfallContext =
        (params.rainLast3h ?? 0) >= 20
            ? `Recent rainfall is elevated, with about ${formatMetric(params.rainLast3h, " mm")} in the last 3 hours.`
            : (params.forecastRainNext6h ?? 0) >= 15
                ? `Near-term forecast rainfall remains elevated, with about ${formatMetric(params.forecastRainNext6h, " mm")} expected over the next 6 hours.`
                : `Current rainfall pressure is not the only concern, and baseline flood exposure still matters in this zone.`;

    const structuralContext =
        (params.riverProximityKm ?? 99) <= 0.5
            ? "River proximity increases the chance of rapid overflow or backflow impacts."
            : params.drainageScore <= 35
                ? "Drainage weakness is a major local flood driver in this area."
                : "Static flood factors remain present but are not the sole driver right now.";

    const dataContext =
        params.dataFreshness === "stale" || (params.operationalConfidence ?? 1) < 0.6
            ? "Use this brief as decision support and confirm conditions with fresh operational checks."
            : "The briefing is supported by a recent weather snapshot and current zone assessment.";

    return `${locationLabel} is currently assessed at ${params.riskLevel} flood risk with a score of ${params.riskScore.toFixed(1)}/100. ${rainfallContext} ${structuralContext} ${dataContext}`;
}

function normalizeAiResponse(
    raw: unknown,
    params: FloodRiskAiParams,
): { summary: string; recommendations: string[]; confidence: number } {
    const candidate = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
    const fallbackSummary = buildDeterministicSummary(params);
    const fallbackRecommendations = buildDeterministicRecommendations(params);

    const summary =
        typeof candidate.summary === "string" && candidate.summary.trim().length >= 40
            ? candidate.summary.trim()
            : fallbackSummary;

    const recommendations = Array.isArray(candidate.recommendations)
        ? candidate.recommendations
            .filter((item): item is string => typeof item === "string" && item.trim().length > 12)
            .map((item) => item.trim())
            .slice(0, 4)
        : [];

    const confidenceCandidate =
        typeof candidate.confidence === "number"
            ? candidate.confidence
            : params.operationalConfidence ?? (params.riskScore >= 55 ? 0.72 : 0.64);

    return {
        summary,
        recommendations: recommendations.length >= 3 ? recommendations : fallbackRecommendations,
        confidence: Math.min(0.95, Math.max(0.35, confidenceCandidate)),
    };
}

export async function analyzeFloodRisk(
    params: FloodRiskAiParams,
): Promise<{ summary: string; recommendations: string[]; confidence: number }> {
    const model = getGenerativeModel("gemini-2.0-flash-001");
    const locationLabel = buildLocationLabel(params);

    const prompt = `You are a senior flood operations analyst for East Africa. Produce a strong, specific operational brief for ${locationLabel}.

Location: ${locationLabel}
Risk Level: ${params.riskLevel}
Risk Score: ${params.riskScore}/100
Current Rain Intensity: ${params.precipitationMm} mm/hr
Current Rain Probability: ${params.precipitationProbability ?? "Unavailable"}%
Rain Last 1h: ${params.rainLast1h ?? "Unavailable"} mm
Rain Last 3h: ${params.rainLast3h ?? "Unavailable"} mm
Rain Last 24h: ${params.rainLast24h ?? "Unavailable"} mm
Forecast Rain Next 6h: ${params.forecastRainNext6h ?? "Unavailable"} mm
Forecast Rain Next 24h: ${params.forecastRainNext24h ?? "Unavailable"} mm
Max Rain Probability Next 6h: ${params.forecastProbabilityMaxNext6h ?? "Unavailable"}%
Max Rain Probability Next 24h: ${params.forecastProbabilityMaxNext24h ?? "Unavailable"}%
Operational Confidence: ${params.operationalConfidence ?? "Unavailable"}
Data Freshness: ${params.dataFreshness ?? "unknown"}
River Proximity: ${params.riverProximityKm !== null ? `${params.riverProximityKm} km` : "Unknown"}
Drainage Score: ${params.drainageScore}/100
Historical Flood Score: ${params.historicalFloodScore}/100
Population at Risk: ${params.populationAtRisk.toLocaleString()}
Risk Component Scores:
- Current Rainfall Score: ${params.rainfallScore ?? "Unavailable"}
- Accumulation Score: ${params.accumulationScore ?? "Unavailable"}
- Forecast Score: ${params.forecastScore ?? "Unavailable"}
- River Score: ${params.riverScore ?? "Unavailable"}
- Drainage Risk Score: ${params.drainageRiskScore ?? "Unavailable"}
- Data Quality Score: ${params.dataQualityScore ?? "Unavailable"}

Respond in JSON with this exact structure:
{
  "summary": "3-4 sentence operational brief that cites the main drivers for this exact zone",
  "recommendations": ["specific action 1", "specific action 2", "specific action 3", "optional action 4"],
  "confidence": 0.85
}

Rules:
- Do not say Nairobi unless the location is actually in Nairobi County.
- Do not use generic wording like "monitor closely" unless you also explain what specifically is driving risk.
- Recommendations must vary based on the inputs. High recent rainfall should lead to runoff and drainage actions. Strong river exposure should lead to river corridor actions. Strong forecast rainfall should lead to pre-emptive warnings and staging.
- Recommendations must match responder responsibilities:
  - disaster managers coordinate field response, shelters, public safety actions, and escalation
  - resident broadcasts are handled by the disaster management team through their SMS integration
- Avoid repeating the same wording patterns across zones.
- Be concise, factual, and operationally useful.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
        return normalizeAiResponse(JSON.parse(text), params);
    } catch (err) {
        console.error("[Vertex AI] analyzeFloodRisk error:", err);
        return normalizeAiResponse({}, params);
    }
}

export async function composeSmsAlert(params: {
    zoneName: string;
    riskLevel: string;
    specificThreat: string;
    shelterNames: string[];
    language?: "en" | "sw";
}): Promise<string> {
    const smsModel = vertex.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
    });
    const lang = params.language === "sw" ? "Kiswahili" : "English";

    const prompt = `Compose an emergency flood SMS alert in ${lang} for residents of ${params.zoneName}.

Risk Level: ${params.riskLevel}
Specific Threat: ${params.specificThreat}
Nearby Shelters: ${params.shelterNames.join(", ") || "Contact local authorities"}

Requirements:
- Maximum 160 characters
- Start with zone name
- Include one clear action
- Include "Reply 1=NEED HELP 2=SAFE" at end if space allows
- Use simple, clear language understood by all literacy levels
- In ${lang}

Return ONLY the SMS text, nothing else.`;

    try {
        const result = await smsModel.generateContent(prompt);
        const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        return text.slice(0, 160);
    } catch (err) {
        console.error("[Vertex AI] composeSmsAlert error:", err);
        return `FLOOD ALERT [${params.zoneName}]: ${params.riskLevel} risk. Move to higher ground. Reply 1=NEED HELP 2=SAFE. FloodGuard`;
    }
}
