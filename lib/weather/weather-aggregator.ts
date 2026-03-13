// Weather Aggregation Service
// Combines Tomorrow.io + OpenWeather, normalizes, calculates confidence score

import { fetchTomorrowWeather, TomorrowWeatherData } from "./tomorrow-io";
import { fetchOpenWeather, OpenWeatherData } from "./openweather";

export interface NormalizedWeather {
    precipitationIntensity: number;
    precipitationProbability: number;
    humidity: number;
    windSpeed: number;
    temperature: number;
    confidenceScore: number; // 0-1
    tomorrowPayload: unknown | null;
    openweatherPayload: unknown | null;
}

/**
 * Calculates confidence score (0-1) based on agreement between two providers.
 * Lower divergence = higher confidence.
 */
function calculateConfidence(
    a: Pick<TomorrowWeatherData, "precipitationIntensity" | "humidity" | "windSpeed" | "temperature">,
    b: Pick<OpenWeatherData, "precipitationIntensity" | "humidity" | "windSpeed" | "temperature">
): number {
    const diff = (x: number, y: number, scale: number) =>
        Math.abs(x - y) / Math.max(scale, 1);

    const precipDiff = diff(a.precipitationIntensity, b.precipitationIntensity, 10);
    const humidDiff = diff(a.humidity, b.humidity, 100);
    const windDiff = diff(a.windSpeed, b.windSpeed, 20);
    const tempDiff = diff(a.temperature, b.temperature, 40);

    const avgDivergence = (precipDiff + humidDiff + windDiff + tempDiff) / 4;
    return Math.max(0, Math.min(1, 1 - avgDivergence));
}

/**
 * Fetches weather from both providers, normalizes, and returns combined snapshot.
 * Falls back gracefully if one provider fails.
 */
export async function aggregateWeather(
    lat: number,
    lng: number
): Promise<NormalizedWeather | null> {
    const [tomorrowResult, openweatherResult] = await Promise.allSettled([
        fetchTomorrowWeather(lat, lng),
        fetchOpenWeather(lat, lng),
    ]);

    const tomorrow =
        tomorrowResult.status === "fulfilled" ? tomorrowResult.value : null;
    const openweather =
        openweatherResult.status === "fulfilled" ? openweatherResult.value : null;

    // Both failed
    if (!tomorrow && !openweather) {
        console.error("[WeatherAggregator] Both providers failed");
        return null;
    }

    // Only Tomorrow.io available — use directly
    if (tomorrow && !openweather) {
        return {
            precipitationIntensity: tomorrow.data.precipitationIntensity,
            precipitationProbability: tomorrow.data.precipitationProbability,
            humidity: tomorrow.data.humidity,
            windSpeed: tomorrow.data.windSpeed,
            temperature: tomorrow.data.temperature,
            confidenceScore: 0.7, // single source penalty
            tomorrowPayload: tomorrow.raw,
            openweatherPayload: null,
        };
    }

    // Only OpenWeather available — use directly
    if (!tomorrow && openweather) {
        return {
            precipitationIntensity: openweather.data.precipitationIntensity,
            precipitationProbability: openweather.data.precipitationProbability,
            humidity: openweather.data.humidity,
            windSpeed: openweather.data.windSpeed,
            temperature: openweather.data.temperature,
            confidenceScore: 0.6, // single source penalty
            tomorrowPayload: null,
            openweatherPayload: openweather.raw,
        };
    }

    // Both available — weight Tomorrow.io more (more accurate for forecasting)
    const t = tomorrow!.data;
    const o = openweather!.data;

    const precipIntensity = t.precipitationIntensity * 0.65 + o.precipitationIntensity * 0.35;
    const precipProb = t.precipitationProbability * 0.65 + o.precipitationProbability * 0.35;
    const humidity = t.humidity * 0.6 + o.humidity * 0.4;
    const windSpeed = t.windSpeed * 0.6 + o.windSpeed * 0.4;
    const temperature = t.temperature * 0.6 + o.temperature * 0.4;

    const confidence = calculateConfidence(t, o);

    return {
        precipitationIntensity: Math.round(precipIntensity * 100) / 100,
        precipitationProbability: Math.round(precipProb * 100) / 100,
        humidity: Math.round(humidity * 100) / 100,
        windSpeed: Math.round(windSpeed * 100) / 100,
        temperature: Math.round(temperature * 100) / 100,
        confidenceScore: Math.round(confidence * 1000) / 1000,
        tomorrowPayload: tomorrow!.raw,
        openweatherPayload: openweather!.raw,
    };
}
