/**
 * Vertex AI Client — FloodGuard Platform
 *
 * Initializes the Google Vertex AI SDK using service account credentials.
 * Used for flood risk prediction, weather pattern analysis, and
 * AI-assisted disaster response recommendations.
 *
 * Models available:
 *   - gemini-2.0-flash-001     → fast inference, real-time alerts
 *   - gemini-1.5-pro-002       → deep analysis, risk reports
 *   - text-embedding-004       → semantic search, zone similarity
 */

import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID!;
const LOCATION = process.env.VERTEX_AI_LOCATION ?? "us-central1";

// Singleton to prevent re-initialization on every request
const globalForVertex = globalThis as unknown as { vertex: VertexAI | undefined };

export const vertex: VertexAI =
    globalForVertex.vertex ??
    new VertexAI({
        project: PROJECT_ID,
        location: LOCATION,
        // GOOGLE_APPLICATION_CREDENTIALS env var is picked up automatically
        // by the Google Auth Library from the service account JSON
    });

if (process.env.NODE_ENV !== "production") {
    globalForVertex.vertex = vertex;
}

/**
 * Get a Gemini generative model instance
 * @param model - Model name (default: gemini-2.0-flash-001 for real-time use)
 */
export function getGenerativeModel(model = "gemini-2.0-flash-001") {
    return vertex.getGenerativeModel({
        model,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
        generationConfig: {
            temperature: 0.2,        // low = factual, deterministic
            topP: 0.8,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
        },
    });
}

/**
 * FloodGuard AI — Flood Risk Analysis
 * Asks Gemini to analyze weather data and produce a risk summary + recommendations
 */
export async function analyzeFloodRisk(params: {
    zoneName: string;
    riskLevel: string;
    riskScore: number;
    precipitationMm: number;
    riverProximityKm: number | null;
    drainageScore: number;
    historicalFloodScore: number;
    populationAtRisk: number;
}): Promise<{ summary: string; recommendations: string[]; confidence: number }> {
    const model = getGenerativeModel("gemini-2.0-flash-001");

    const prompt = `You are a flood risk analysis expert for East Africa. Analyze the following data for ${params.zoneName} in Nairobi and provide a concise risk assessment.

Zone: ${params.zoneName}
Risk Level: ${params.riskLevel}
Risk Score: ${params.riskScore}/100
Precipitation: ${params.precipitationMm}mm
River Proximity: ${params.riverProximityKm ? `${params.riverProximityKm}km` : 'Unknown'}
Drainage Score: ${params.drainageScore}% (higher = better drainage)
Historical Flood Score: ${params.historicalFloodScore}/100 (higher = more flood-prone)
Population at Risk: ${params.populationAtRisk.toLocaleString()}

Respond in JSON with this exact structure:
{
  "summary": "2-3 sentence plain-language summary for emergency coordinators",
  "recommendations": ["action 1", "action 2", "action 3"],
  "confidence": 0.85
}

Keep it concise, factual, and actionable. Focus on immediate actions for Nairobi flood responders.
Recommendations should match responder responsibilities:
- disaster managers coordinate field response, shelters, public safety actions, and escalation
- resident broadcasts are handled by the disaster management team through their SMS integration, so recommendations should tell coordinators to prepare or send alerts directly when appropriate
- do not assign actions outside the emergency coordination role unless phrased as coordination with the responsible partner.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
        return JSON.parse(text);
    } catch (err) {
        console.error("[Vertex AI] analyzeFloodRisk error:", err);
        return {
            summary: `${params.zoneName} is at ${params.riskLevel} flood risk with a score of ${params.riskScore}/100.`,
            recommendations: [
                "Monitor river levels and rainfall continuously",
                "Pre-position rescue resources in nearby staging areas",
                "Prepare resident SMS alerts if risk increases and notify field teams early",
            ],
            confidence: 0.5,
        };
    }
}

/**
 * FloodGuard AI — SMS Alert Composer
 * Uses Gemini to compose a context-aware SMS alert message
 */
export async function composeSmsAlert(params: {
    zoneName: string;
    riskLevel: string;
    specificThreat: string;
    shelterNames: string[];
    language?: "en" | "sw"; // English or Kiswahili
}): Promise<string> {
    const smsModel = vertex.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
    });
    const lang = params.language === "sw" ? "Kiswahili" : "English";

    const prompt = `Compose an emergency flood SMS alert in ${lang} for residents of ${params.zoneName}, Nairobi.

Risk Level: ${params.riskLevel}
Specific Threat: ${params.specificThreat}
Nearby Shelters: ${params.shelterNames.join(", ") || "Contact local authorities"}

Requirements:
- Maximum 160 characters (one SMS)
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


