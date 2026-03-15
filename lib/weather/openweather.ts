// OpenWeather API Service (secondary weather provider)
// Uses current weather plus 3-hour forecast windows for production flood operations.

import { calculateDataCompleteness, emptyDerivedMetrics, roundMetric, WeatherDerivedMetrics } from "./derived-metrics";
import { fetchWithProviderReliability } from "./provider-reliability";

export interface OpenWeatherData {
    precipitationIntensity: number; // mm/hr (last hour rain when available)
    precipitationProbability: number; // 0-100 from near-term forecast POP
    humidity: number; // %
    windSpeed: number; // m/s
    windDirection: number; // degrees
    temperature: number; // Celsius
    cloudCover: number; // %
    uvIndex: number; // not in current endpoint
    derived: WeatherDerivedMetrics;
    dataCompletenessScore: number; // 0-1
}

interface OpenWeatherCurrentResponse {
    main?: {
        temp?: number;
        humidity?: number;
    };
    wind?: {
        speed?: number;
        deg?: number;
    };
    clouds?: {
        all?: number;
    };
    rain?: {
        "1h"?: number;
        "3h"?: number;
    };
    dt?: number;
    name?: string;
}

interface OpenWeatherForecastResponse {
    list?: Array<{
        dt?: number;
        pop?: number;
        rain?: {
            "3h"?: number;
        };
        main?: {
            temp?: number;
            humidity?: number;
        };
    }>;
    city?: {
        name?: string;
    };
}

function sumForecastRain(intervals: Array<{ rainMm: number; pop: number }>, count: number) {
    const slice = intervals.slice(0, count);
    if (slice.length === 0) return { rain: null, probabilityMax: null };

    return {
        rain: roundMetric(slice.reduce((sum, interval) => sum + interval.rainMm, 0)),
        probabilityMax: roundMetric(Math.max(...slice.map((interval) => interval.pop))),
    };
}

export async function fetchOpenWeather(
    lat: number,
    lng: number
): Promise<{ data: OpenWeatherData; raw: unknown } | null> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.warn("[OpenWeather] API key not set");
        return null;
    }

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetchWithProviderReliability("OPENWEATHER", currentUrl),
            fetchWithProviderReliability("OPENWEATHER", forecastUrl),
        ]);

        if (!currentRes) {
            console.error("[OpenWeather] Current request failed after retries");
            return null;
        }

        const currentJson: OpenWeatherCurrentResponse = await currentRes.json();
        const forecastJson: OpenWeatherForecastResponse | null = forecastRes
            ? await forecastRes.json()
            : null;

        const forecastIntervals = (forecastJson?.list ?? []).map((interval) => ({
            rainMm: interval.rain?.["3h"] ?? 0,
            pop: (interval.pop ?? 0) * 100,
        }));
        const next6h = sumForecastRain(forecastIntervals, 2);
        const next24h = sumForecastRain(forecastIntervals, 8);
        const nearTermProbability = forecastIntervals[0]?.pop ?? 0;

        const derived: WeatherDerivedMetrics = {
            ...emptyDerivedMetrics(),
            rainLast1h: roundMetric(currentJson.rain?.["1h"] ?? null),
            rainLast3h: roundMetric(currentJson.rain?.["3h"] ?? null),
            forecastRainNext6h: next6h.rain,
            forecastRainNext24h: next24h.rain,
            forecastProbabilityMaxNext6h: next6h.probabilityMax,
            forecastProbabilityMaxNext24h: next24h.probabilityMax,
        };

        const completeness = calculateDataCompleteness([
            currentJson.rain?.["1h"] ?? null,
            nearTermProbability,
            currentJson.main?.humidity ?? null,
            currentJson.wind?.speed ?? null,
            currentJson.main?.temp ?? null,
            derived.forecastRainNext6h,
            derived.forecastRainNext24h,
            derived.forecastProbabilityMaxNext6h,
            derived.forecastProbabilityMaxNext24h,
        ]);

        const data: OpenWeatherData = {
            precipitationIntensity: currentJson.rain?.["1h"] ?? 0,
            precipitationProbability: nearTermProbability,
            humidity: currentJson.main?.humidity ?? 0,
            windSpeed: currentJson.wind?.speed ?? 0,
            windDirection: currentJson.wind?.deg ?? 0,
            temperature: currentJson.main?.temp ?? 0,
            cloudCover: currentJson.clouds?.all ?? 0,
            uvIndex: 0,
            derived,
            dataCompletenessScore: roundMetric(completeness, 3) ?? 0,
        };

        return {
            data,
            raw: {
                provider: "OPENWEATHER",
                current: currentJson,
                forecast: forecastJson,
                derived,
            },
        };
    } catch (err) {
        console.error("[OpenWeather] Fetch failed:", err);
        return null;
    }
}
