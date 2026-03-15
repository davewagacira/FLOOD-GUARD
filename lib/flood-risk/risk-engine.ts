// Flood Risk Engine
// Deterministic scoring based on recent rainfall, near-term forecast, and zone characteristics.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface FloodRiskInputs {
    precipitationIntensity: number;   // mm/hr now
    precipitationProbability: number; // 0-100 near-term chance
    rainLast1h?: number | null;
    rainLast3h?: number | null;
    rainLast6h?: number | null;
    rainLast24h?: number | null;
    forecastRainNext6h?: number | null;
    forecastRainNext24h?: number | null;
    forecastProbabilityMaxNext6h?: number | null;
    forecastProbabilityMaxNext24h?: number | null;
    operationalConfidenceScore?: number | null;
    currentRainThresholdMmHr?: number | null;
    rain1hThresholdMm?: number | null;
    rain3hThresholdMm?: number | null;
    rain24hThresholdMm?: number | null;
    forecast6hThresholdMm?: number | null;
    forecast24hThresholdMm?: number | null;
    triggerProbabilityThreshold?: number | null;
    minOperationalConfidence?: number | null;

    riverProximityKm: number | null;
    drainageScore: number;
    historicalFloodScore: number;
    elevationM: number | null;
}

export interface FloodRiskResult {
    riskScore: number;
    riskLevel: RiskLevel;
    rainfallScore: number;
    accumulationScore: number;
    forecastScore: number;
    riverScore: number;
    drainageScore: number;
    historicalScore: number;
    elevationScore: number;
    dataQualityScore: number;
}

function currentRainfallScore(intensityMmHr: number): number {
    if (intensityMmHr < 0.5) return Math.min(2, intensityMmHr * 4);
    if (intensityMmHr < 2) return 2 + (intensityMmHr - 0.5) * 3;
    if (intensityMmHr < 10) return 6.5 + (intensityMmHr - 2) * 1.1875;
    if (intensityMmHr < 50) return 16 + (intensityMmHr - 10) * 0.05;
    return 18;
}

function relativeThresholdScore(value: number | null | undefined, threshold: number | null | undefined, maxScore: number) {
    if (value === null || value === undefined || threshold === null || threshold === undefined || threshold <= 0) return 0;
    const ratio = value / threshold;
    if (ratio < 0.4) return 0;
    if (ratio < 0.75) return maxScore * 0.35;
    if (ratio < 1) return maxScore * 0.65;
    if (ratio < 1.25) return maxScore * 0.85;
    return maxScore;
}

function normalizeThresholdScore(value: number | null | undefined, thresholds: Array<{ limit: number; score: number }>, maxScore: number) {
    if (value === null || value === undefined) return 0;

    for (const threshold of thresholds) {
        if (value < threshold.limit) return threshold.score;
    }
    return maxScore;
}

function accumulationScore(inputs: FloodRiskInputs): number {
    return Math.max(
        relativeThresholdScore(inputs.rainLast1h, inputs.rain1hThresholdMm, 14),
        normalizeThresholdScore(inputs.rainLast1h, [
            { limit: 2, score: 1 },
            { limit: 5, score: 4 },
            { limit: 10, score: 8 },
            { limit: 20, score: 12 },
            { limit: 30, score: 16 },
        ], 22),
        relativeThresholdScore(inputs.rainLast3h, inputs.rain3hThresholdMm, 18),
        normalizeThresholdScore(inputs.rainLast3h, [
            { limit: 5, score: 2 },
            { limit: 10, score: 6 },
            { limit: 20, score: 10 },
            { limit: 35, score: 14 },
            { limit: 50, score: 18 },
        ], 22),
        normalizeThresholdScore(inputs.rainLast6h, [
            { limit: 8, score: 3 },
            { limit: 15, score: 7 },
            { limit: 30, score: 12 },
            { limit: 50, score: 17 },
            { limit: 75, score: 20 },
        ], 22),
        relativeThresholdScore(inputs.rainLast24h, inputs.rain24hThresholdMm, 22),
        normalizeThresholdScore(inputs.rainLast24h, [
            { limit: 15, score: 4 },
            { limit: 30, score: 8 },
            { limit: 60, score: 13 },
            { limit: 100, score: 18 },
            { limit: 150, score: 21 },
        ], 22)
    );
}

function forecastScore(inputs: FloodRiskInputs): number {
    const rainfallRisk = Math.max(
        relativeThresholdScore(inputs.forecastRainNext6h, inputs.forecast6hThresholdMm, 10),
        normalizeThresholdScore(inputs.forecastRainNext6h, [
            { limit: 5, score: 1 },
            { limit: 10, score: 4 },
            { limit: 20, score: 7 },
            { limit: 35, score: 10 },
        ], 12),
        relativeThresholdScore(inputs.forecastRainNext24h, inputs.forecast24hThresholdMm, 12),
        normalizeThresholdScore(inputs.forecastRainNext24h, [
            { limit: 15, score: 2 },
            { limit: 30, score: 5 },
            { limit: 60, score: 8 },
            { limit: 100, score: 11 },
        ], 12)
    );

    const triggerThreshold = inputs.triggerProbabilityThreshold ?? 65;
    const probabilityFactor = triggerThreshold > 0 ? 100 / triggerThreshold : 1;
    const probabilityRisk = Math.max(
        Math.min(6, ((inputs.forecastProbabilityMaxNext6h ?? 0) / 100) * 6 * probabilityFactor),
        Math.min(4, ((inputs.forecastProbabilityMaxNext24h ?? 0) / 100) * 4 * probabilityFactor),
        Math.min(4, (inputs.precipitationProbability / 100) * 4 * probabilityFactor)
    );

    return Math.min(12, rainfallRisk + probabilityRisk);
}

function riverProximityScore(proximityKm: number | null): number {
    if (proximityKm === null) return 5;
    if (proximityKm < 0.1) return 15;
    if (proximityKm < 0.5) return 12;
    if (proximityKm < 1) return 9;
    if (proximityKm < 3) return 6;
    if (proximityKm < 5) return 3;
    return 1;
}

function drainageRiskScore(drainageScore: number): number {
    return ((100 - drainageScore) / 100) * 10;
}

function historicalRiskScore(historicalFloodScore: number): number {
    return (historicalFloodScore / 100) * 8;
}

function elevationRiskScore(elevationM: number | null): number {
    if (elevationM === null) return 3.5;
    if (elevationM < 10) return 7;
    if (elevationM < 50) return 6;
    if (elevationM < 100) return 5;
    if (elevationM < 300) return 3.5;
    if (elevationM < 500) return 2;
    return 1;
}

function dataQualityScore(operationalConfidenceScore: number | null | undefined): number {
    if (operationalConfidenceScore === null || operationalConfidenceScore === undefined) return 0;
    return Math.max(0, Math.min(8, operationalConfidenceScore * 8));
}

export function classifyRiskLevel(score: number): RiskLevel {
    if (score >= 75) return "CRITICAL";
    if (score >= 55) return "HIGH";
    if (score >= 30) return "MEDIUM";
    return "LOW";
}

export function calculateFloodRisk(inputs: FloodRiskInputs): FloodRiskResult {
    const thresholdAdjustedCurrentRain = Math.max(
        currentRainfallScore(inputs.precipitationIntensity),
        relativeThresholdScore(inputs.precipitationIntensity, inputs.currentRainThresholdMmHr, 18)
    );
    const accumulation = accumulationScore(inputs);
    const forecast = forecastScore(inputs);
    const river = riverProximityScore(inputs.riverProximityKm);
    const drainage = drainageRiskScore(inputs.drainageScore);
    const historical = historicalRiskScore(inputs.historicalFloodScore);
    const elevation = elevationRiskScore(inputs.elevationM);
    const dataQuality = dataQualityScore(inputs.operationalConfidenceScore ?? null);
    const minimumConfidencePenalty = (inputs.minOperationalConfidence ?? 0.55) > (inputs.operationalConfidenceScore ?? 0)
        ? -4
        : 0;

    const totalScore = thresholdAdjustedCurrentRain + accumulation + forecast + river + drainage + historical + elevation + dataQuality + minimumConfidencePenalty;
    const riskScore = Math.min(100, Math.round(totalScore * 10) / 10);
    const riskLevel = classifyRiskLevel(riskScore);

    return {
        riskScore,
        riskLevel,
        rainfallScore: Math.round(thresholdAdjustedCurrentRain * 10) / 10,
        accumulationScore: Math.round(accumulation * 10) / 10,
        forecastScore: Math.round(forecast * 10) / 10,
        riverScore: Math.round(river * 10) / 10,
        drainageScore: Math.round(drainage * 10) / 10,
        historicalScore: Math.round(historical * 10) / 10,
        elevationScore: Math.round(elevation * 10) / 10,
        dataQualityScore: Math.round(dataQuality * 10) / 10,
    };
}
