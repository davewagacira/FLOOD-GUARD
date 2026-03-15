// Weather Aggregation Service
// Combines Tomorrow.io + OpenWeather, normalizes recent/forecast rainfall, and computes operational confidence.

import {
    attachAggregationMetadata,
    calculateOperationalConfidence,
    maxNullable,
    roundMetric,
    weightedAverageNullable,
    WeatherAggregationMetadata,
    WeatherDerivedMetrics,
} from "./derived-metrics";
import { fetchTomorrowWeather, TomorrowWeatherData } from "./tomorrow-io";
import { fetchOpenWeather, OpenWeatherData } from "./openweather";

export interface NormalizedWeather extends WeatherDerivedMetrics {
    precipitationIntensity: number;
    precipitationProbability: number;
    humidity: number;
    windSpeed: number;
    temperature: number;
    confidenceScore: number; // provider agreement, kept for backward compatibility
    providerAgreementScore: number;
    dataCompletenessScore: number;
    operationalConfidenceScore: number;
    providerCount: number;
    tomorrowPayload: unknown | null;
    openweatherPayload: unknown | null;
}

function calculateProviderAgreement(
    tomorrow: Pick<TomorrowWeatherData, "precipitationIntensity" | "humidity" | "windSpeed" | "temperature"> | null,
    openweather: Pick<OpenWeatherData, "precipitationIntensity" | "humidity" | "windSpeed" | "temperature"> | null
): number {
    if (!tomorrow && !openweather) return 0;
    if (!tomorrow || !openweather) return 0.68;

    const diff = (x: number, y: number, scale: number) => Math.abs(x - y) / Math.max(scale, 1);
    const precipDiff = diff(tomorrow.precipitationIntensity, openweather.precipitationIntensity, 10);
    const humidDiff = diff(tomorrow.humidity, openweather.humidity, 100);
    const windDiff = diff(tomorrow.windSpeed, openweather.windSpeed, 20);
    const tempDiff = diff(tomorrow.temperature, openweather.temperature, 40);

    const avgDivergence = (precipDiff + humidDiff + windDiff + tempDiff) / 4;
    return Math.max(0, Math.min(1, 1 - avgDivergence));
}

function mergeDerivedMetrics(
    tomorrow: TomorrowWeatherData | null,
    openweather: OpenWeatherData | null
): WeatherDerivedMetrics {
    const t = tomorrow?.derived;
    const o = openweather?.derived;

    return {
        rainLast1h: roundMetric(weightedAverageNullable([
            { value: t?.rainLast1h, weight: 0.65 },
            { value: o?.rainLast1h, weight: 0.35 },
        ])),
        rainLast3h: roundMetric(weightedAverageNullable([
            { value: t?.rainLast3h, weight: 0.65 },
            { value: o?.rainLast3h, weight: 0.35 },
        ])),
        rainLast6h: roundMetric(weightedAverageNullable([
            { value: t?.rainLast6h, weight: 0.65 },
            { value: o?.rainLast6h, weight: 0.35 },
        ])),
        rainLast24h: roundMetric(weightedAverageNullable([
            { value: t?.rainLast24h, weight: 0.65 },
            { value: o?.rainLast24h, weight: 0.35 },
        ])),
        forecastRainNext6h: roundMetric(weightedAverageNullable([
            { value: t?.forecastRainNext6h, weight: 0.65 },
            { value: o?.forecastRainNext6h, weight: 0.35 },
        ])),
        forecastRainNext24h: roundMetric(weightedAverageNullable([
            { value: t?.forecastRainNext24h, weight: 0.65 },
            { value: o?.forecastRainNext24h, weight: 0.35 },
        ])),
        forecastProbabilityMaxNext6h: roundMetric(maxNullable([
            t?.forecastProbabilityMaxNext6h,
            o?.forecastProbabilityMaxNext6h,
        ])),
        forecastProbabilityMaxNext24h: roundMetric(maxNullable([
            t?.forecastProbabilityMaxNext24h,
            o?.forecastProbabilityMaxNext24h,
        ])),
    };
}

export async function aggregateWeather(
    lat: number,
    lng: number
): Promise<NormalizedWeather | null> {
    const [tomorrowResult, openweatherResult] = await Promise.allSettled([
        fetchTomorrowWeather(lat, lng),
        fetchOpenWeather(lat, lng),
    ]);

    const tomorrow = tomorrowResult.status === "fulfilled" ? tomorrowResult.value : null;
    const openweather = openweatherResult.status === "fulfilled" ? openweatherResult.value : null;

    if (!tomorrow && !openweather) {
        console.error("[WeatherAggregator] Both providers failed");
        return null;
    }

    const t = tomorrow?.data ?? null;
    const o = openweather?.data ?? null;
    const providerCount = [t, o].filter(Boolean).length;
    const providerAgreementScore = roundMetric(calculateProviderAgreement(t, o), 3) ?? 0;
    const dataCompletenessScore = roundMetric(weightedAverageNullable([
        { value: t?.dataCompletenessScore ?? null, weight: 0.65 },
        { value: o?.dataCompletenessScore ?? null, weight: 0.35 },
    ]), 3) ?? 0;
    const operationalConfidenceScore = roundMetric(
        calculateOperationalConfidence(providerAgreementScore, dataCompletenessScore, providerCount),
        3
    ) ?? 0;

    const derived = mergeDerivedMetrics(t, o);
    const metadata: WeatherAggregationMetadata = {
        ...derived,
        providerAgreementScore,
        dataCompletenessScore,
        operationalConfidenceScore,
        providerCount,
    };

    return {
        precipitationIntensity: roundMetric(weightedAverageNullable([
            { value: t?.precipitationIntensity ?? null, weight: 0.65 },
            { value: o?.precipitationIntensity ?? null, weight: 0.35 },
        ])) ?? 0,
        precipitationProbability: roundMetric(maxNullable([
            t?.precipitationProbability ?? null,
            o?.precipitationProbability ?? null,
            derived.forecastProbabilityMaxNext6h,
        ])) ?? 0,
        humidity: roundMetric(weightedAverageNullable([
            { value: t?.humidity ?? null, weight: 0.6 },
            { value: o?.humidity ?? null, weight: 0.4 },
        ])) ?? 0,
        windSpeed: roundMetric(weightedAverageNullable([
            { value: t?.windSpeed ?? null, weight: 0.6 },
            { value: o?.windSpeed ?? null, weight: 0.4 },
        ])) ?? 0,
        temperature: roundMetric(weightedAverageNullable([
            { value: t?.temperature ?? null, weight: 0.6 },
            { value: o?.temperature ?? null, weight: 0.4 },
        ])) ?? 0,
        confidenceScore: providerAgreementScore,
        providerAgreementScore,
        dataCompletenessScore,
        operationalConfidenceScore,
        providerCount,
        ...derived,
        tomorrowPayload: attachAggregationMetadata(tomorrow?.raw ?? null, metadata),
        openweatherPayload: attachAggregationMetadata(openweather?.raw ?? null, metadata),
    };
}
