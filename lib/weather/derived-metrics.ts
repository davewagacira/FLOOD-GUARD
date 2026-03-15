export interface WeatherDerivedMetrics {
    rainLast1h: number | null;
    rainLast3h: number | null;
    rainLast6h: number | null;
    rainLast24h: number | null;
    forecastRainNext6h: number | null;
    forecastRainNext24h: number | null;
    forecastProbabilityMaxNext6h: number | null;
    forecastProbabilityMaxNext24h: number | null;
}

export interface WeatherAggregationMetadata extends WeatherDerivedMetrics {
    providerAgreementScore: number;
    dataCompletenessScore: number;
    operationalConfidenceScore: number;
    providerCount: number;
}

type DerivedCarrier = {
    derived?: Partial<WeatherDerivedMetrics> | null;
    _aggregator?: Partial<WeatherAggregationMetadata> | null;
} | null | undefined;

function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

export function roundMetric(value: number | null, precision = 2): number | null {
    if (value === null || Number.isNaN(value) || !Number.isFinite(value)) return null;
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}

export function weightedAverageNullable(values: Array<{ value: number | null | undefined; weight: number }>): number | null {
    const available = values.filter((entry) => typeof entry.value === "number" && Number.isFinite(entry.value));
    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return null;

    const weightedSum = available.reduce((sum, entry) => sum + (entry.value as number) * entry.weight, 0);
    return weightedSum / totalWeight;
}

export function maxNullable(values: Array<number | null | undefined>): number | null {
    const available = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (available.length === 0) return null;
    return Math.max(...available);
}

export function emptyDerivedMetrics(): WeatherDerivedMetrics {
    return {
        rainLast1h: null,
        rainLast3h: null,
        rainLast6h: null,
        rainLast24h: null,
        forecastRainNext6h: null,
        forecastRainNext24h: null,
        forecastProbabilityMaxNext6h: null,
        forecastProbabilityMaxNext24h: null,
    };
}

export function calculateDataCompleteness(values: Array<number | null | undefined>): number {
    const available = values.filter((value) => typeof value === "number" && Number.isFinite(value)).length;
    return values.length === 0 ? 0 : clamp(available / values.length);
}

export function calculateOperationalConfidence(providerAgreementScore: number, dataCompletenessScore: number, providerCount: number): number {
    const providerCoverageScore = providerCount >= 2 ? 1 : providerCount === 1 ? 0.7 : 0;
    return clamp(providerAgreementScore * 0.5 + dataCompletenessScore * 0.35 + providerCoverageScore * 0.15);
}

export function attachAggregationMetadata<T>(payload: T, metadata: WeatherAggregationMetadata): T | (T & { _aggregator: WeatherAggregationMetadata }) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return payload;
    }

    return {
        ...(payload as Record<string, unknown>),
        _aggregator: metadata,
    } as T & { _aggregator: WeatherAggregationMetadata };
}

export function extractDerivedMetricsFromPayload(payload: unknown): WeatherDerivedMetrics {
    const carrier = payload as DerivedCarrier;
    const derived = carrier?.derived ?? {};

    return {
        rainLast1h: roundMetric(typeof derived.rainLast1h === "number" ? derived.rainLast1h : null),
        rainLast3h: roundMetric(typeof derived.rainLast3h === "number" ? derived.rainLast3h : null),
        rainLast6h: roundMetric(typeof derived.rainLast6h === "number" ? derived.rainLast6h : null),
        rainLast24h: roundMetric(typeof derived.rainLast24h === "number" ? derived.rainLast24h : null),
        forecastRainNext6h: roundMetric(typeof derived.forecastRainNext6h === "number" ? derived.forecastRainNext6h : null),
        forecastRainNext24h: roundMetric(typeof derived.forecastRainNext24h === "number" ? derived.forecastRainNext24h : null),
        forecastProbabilityMaxNext6h: roundMetric(typeof derived.forecastProbabilityMaxNext6h === "number" ? derived.forecastProbabilityMaxNext6h : null),
        forecastProbabilityMaxNext24h: roundMetric(typeof derived.forecastProbabilityMaxNext24h === "number" ? derived.forecastProbabilityMaxNext24h : null),
    };
}

export function extractAggregationMetadataFromPayload(payload: unknown): Partial<WeatherAggregationMetadata> {
    const carrier = payload as DerivedCarrier;
    return carrier?._aggregator ?? {};
}
