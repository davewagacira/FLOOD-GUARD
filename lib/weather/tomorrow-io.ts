// Tomorrow.io Weather API Service
// Uses realtime conditions plus hourly forecast windows for production flood operations.

import { calculateDataCompleteness, emptyDerivedMetrics, roundMetric, WeatherDerivedMetrics } from "./derived-metrics";
import { fetchWithProviderReliability } from "./provider-reliability";

export interface TomorrowWeatherData {
    precipitationIntensity: number; // mm/hr
    precipitationProbability: number; // 0-100
    humidity: number; // %
    windSpeed: number; // m/s
    windDirection: number;
    temperature: number; // Celsius
    cloudCover: number; // %
    uvIndex: number;
    derived: WeatherDerivedMetrics;
    dataCompletenessScore: number; // 0-1
}

interface TomorrowRealtimeResponse {
    data?: {
        time?: string;
        values?: {
            precipitationIntensity?: number;
            precipitationProbability?: number;
            humidity?: number;
            windSpeed?: number;
            windDirection?: number;
            temperature?: number;
            cloudCover?: number;
            uvIndex?: number;
        };
    };
    location?: {
        lat?: number;
        lon?: number;
    };
}

interface TomorrowForecastResponse {
    timelines?: {
        hourly?: Array<{
            time?: string;
            values?: {
                precipitationIntensity?: number;
                precipitationProbability?: number;
            };
        }>;
    };
    data?: {
        timelines?: Array<{
            timestep?: string;
            intervals?: Array<{
                startTime?: string;
                values?: {
                    precipitationIntensity?: number;
                    precipitationProbability?: number;
                };
            }>;
        }>;
    };
}

function sumHourlyWindow(intervals: Array<{ precipitationIntensity: number; precipitationProbability: number }>, hours: number) {
    const slice = intervals.slice(0, hours);
    if (slice.length === 0) return { rain: null, probabilityMax: null };

    return {
        rain: roundMetric(slice.reduce((sum, interval) => sum + interval.precipitationIntensity, 0)),
        probabilityMax: roundMetric(Math.max(...slice.map((interval) => interval.precipitationProbability))),
    };
}

function normalizeHourlyIntervals(response: TomorrowForecastResponse): Array<{ precipitationIntensity: number; precipitationProbability: number }> {
    const fromTimelines = response.timelines?.hourly ?? [];
    if (fromTimelines.length > 0) {
        return fromTimelines.map((interval) => ({
            precipitationIntensity: interval.values?.precipitationIntensity ?? 0,
            precipitationProbability: interval.values?.precipitationProbability ?? 0,
        }));
    }

    const forecastTimeline = response.data?.timelines?.find((timeline) => timeline.timestep === "1h");
    return (forecastTimeline?.intervals ?? []).map((interval) => ({
        precipitationIntensity: interval.values?.precipitationIntensity ?? 0,
        precipitationProbability: interval.values?.precipitationProbability ?? 0,
    }));
}

export async function fetchTomorrowWeather(
    lat: number,
    lng: number
): Promise<{ data: TomorrowWeatherData; raw: unknown } | null> {
    const apiKey = process.env.TOMORROW_API_KEY;
    if (!apiKey) {
        console.warn("[Tomorrow.io] API key not set");
        return null;
    }

    const realtimeFields = [
        "precipitationIntensity",
        "precipitationProbability",
        "humidity",
        "windSpeed",
        "windDirection",
        "temperature",
        "cloudCover",
        "uvIndex",
    ].join(",");
    const forecastFields = ["precipitationIntensity", "precipitationProbability"].join(",");

    const realtimeUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&fields=${realtimeFields}&units=metric&apikey=${apiKey}`;
    const forecastUrl = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h&fields=${forecastFields}&units=metric&apikey=${apiKey}`;

    try {
        const [realtimeRes, forecastRes] = await Promise.all([
            fetchWithProviderReliability("TOMORROW_IO", realtimeUrl),
            fetchWithProviderReliability("TOMORROW_IO", forecastUrl),
        ]);

        if (!realtimeRes) {
            console.error("[Tomorrow.io] Realtime request failed after retries");
            return null;
        }

        const realtimeJson: TomorrowRealtimeResponse = await realtimeRes.json();
        const forecastJson: TomorrowForecastResponse | null = forecastRes
            ? await forecastRes.json()
            : null;

        const currentValues = realtimeJson.data?.values ?? {};
        const hourlyIntervals = forecastJson ? normalizeHourlyIntervals(forecastJson) : [];
        const next6h = sumHourlyWindow(hourlyIntervals, 6);
        const next24h = sumHourlyWindow(hourlyIntervals, 24);

        const derived: WeatherDerivedMetrics = {
            ...emptyDerivedMetrics(),
            rainLast1h: roundMetric(currentValues.precipitationIntensity ?? null),
            forecastRainNext6h: next6h.rain,
            forecastRainNext24h: next24h.rain,
            forecastProbabilityMaxNext6h: next6h.probabilityMax,
            forecastProbabilityMaxNext24h: next24h.probabilityMax,
        };

        const completeness = calculateDataCompleteness([
            currentValues.precipitationIntensity ?? null,
            currentValues.precipitationProbability ?? null,
            currentValues.humidity ?? null,
            currentValues.windSpeed ?? null,
            currentValues.temperature ?? null,
            derived.forecastRainNext6h,
            derived.forecastRainNext24h,
            derived.forecastProbabilityMaxNext6h,
            derived.forecastProbabilityMaxNext24h,
        ]);

        const data: TomorrowWeatherData = {
            precipitationIntensity: currentValues.precipitationIntensity ?? 0,
            precipitationProbability: currentValues.precipitationProbability ?? 0,
            humidity: currentValues.humidity ?? 0,
            windSpeed: currentValues.windSpeed ?? 0,
            windDirection: currentValues.windDirection ?? 0,
            temperature: currentValues.temperature ?? 0,
            cloudCover: currentValues.cloudCover ?? 0,
            uvIndex: currentValues.uvIndex ?? 0,
            derived,
            dataCompletenessScore: roundMetric(completeness, 3) ?? 0,
        };

        return {
            data,
            raw: {
                provider: "TOMORROW_IO",
                current: realtimeJson,
                forecast: forecastJson,
                derived,
            },
        };
    } catch (err) {
        console.error("[Tomorrow.io] Fetch failed:", err);
        return null;
    }
}
