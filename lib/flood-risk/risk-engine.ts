// Flood Risk Engine
// Deterministic scoring based on weather + geographic factors
// Score: 0–100   Levels: LOW | MEDIUM | HIGH | CRITICAL

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface FloodRiskInputs {
    // From weather snapshot
    precipitationIntensity: number;   // mm/hr
    precipitationProbability: number; // 0-100

    // From flood zone config
    riverProximityKm: number | null;  // km from nearest river
    drainageScore: number;            // 0-100, higher = better drainage
    historicalFloodScore: number;     // 0-100, higher = more flood history
    elevationM: number | null;        // meters above sea level
}

export interface FloodRiskResult {
    riskScore: number;      // 0-100
    riskLevel: RiskLevel;
    rainfallScore: number;
    riverScore: number;
    drainageScore: number;
    historicalScore: number;
    elevationScore: number;
}

/**
 * Rainfall intensity component (0–35 points)
 * Based on WMO rainfall intensity classification:
 *  < 0.5 mm/hr  = trace
 *  0.5–2 mm/hr  = light
 *  2–10 mm/hr   = moderate
 *  10–50 mm/hr  = heavy
 *  > 50 mm/hr   = violent
 */
function rainfallIntensityScore(intensityMmHr: number): number {
    if (intensityMmHr < 0.5) return Math.min(2, intensityMmHr * 4);
    if (intensityMmHr < 2) return 2 + (intensityMmHr - 0.5) * 5.3;   // up to ~10
    if (intensityMmHr < 10) return 10 + (intensityMmHr - 2) * 1.875;  // up to ~25
    if (intensityMmHr < 50) return 25 + (intensityMmHr - 10) * 0.25;  // up to  35
    return 35;
}

/**
 * Rainfall probability component (0–15 points)
 */
function probabilityScore(probability: number): number {
    return (probability / 100) * 15;
}

/**
 * River proximity component (0–20 points)
 * Closer to river = higher risk
 */
function riverProximityScore(proximityKm: number | null): number {
    if (proximityKm === null) return 5; // unknown — assume average
    if (proximityKm < 0.1) return 20;
    if (proximityKm < 0.5) return 16;
    if (proximityKm < 1) return 12;
    if (proximityKm < 3) return 8;
    if (proximityKm < 5) return 4;
    return 1;
}

/**
 * Drainage score component (0–15 points)
 * inverted: poor drainage = higher risk
 */
function drainageRiskScore(drainageScore: number): number {
    return ((100 - drainageScore) / 100) * 15;
}

/**
 * Historical flood component (0–10 points)
 */
function historicalRiskScore(historicalFloodScore: number): number {
    return (historicalFloodScore / 100) * 10;
}

/**
 * Elevation component (0–5 points)
 * Low lying = higher risk
 */
function elevationRiskScore(elevationM: number | null): number {
    if (elevationM === null) return 2.5; // unknown — assume average
    if (elevationM < 10) return 5;
    if (elevationM < 50) return 4;
    if (elevationM < 100) return 3;
    if (elevationM < 300) return 2;
    if (elevationM < 500) return 1;
    return 0;
}

/**
 * Classify risk score into level
 */
export function classifyRiskLevel(score: number): RiskLevel {
    if (score >= 75) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
}

/**
 * Main risk scoring function
 */
export function calculateFloodRisk(inputs: FloodRiskInputs): FloodRiskResult {
    const rainfall = rainfallIntensityScore(inputs.precipitationIntensity);
    const probability = probabilityScore(inputs.precipitationProbability);
    const river = riverProximityScore(inputs.riverProximityKm);
    const drainage = drainageRiskScore(inputs.drainageScore);
    const historical = historicalRiskScore(inputs.historicalFloodScore);
    const elevation = elevationRiskScore(inputs.elevationM);

    const totalScore = rainfall + probability + river + drainage + historical + elevation;
    const riskScore = Math.min(100, Math.round(totalScore * 10) / 10);
    const riskLevel = classifyRiskLevel(riskScore);

    return {
        riskScore,
        riskLevel,
        rainfallScore: Math.round(rainfall * 10) / 10,
        riverScore: Math.round(river * 10) / 10,
        drainageScore: Math.round(drainage * 10) / 10,
        historicalScore: Math.round(historical * 10) / 10,
        elevationScore: Math.round(elevation * 10) / 10,
    };
}
