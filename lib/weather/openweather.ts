// OpenWeather API Service (secondary weather provider)
// Docs: https://openweathermap.org/current

export interface OpenWeatherData {
    precipitationIntensity: number; // mm/hr (last hour rain)
    precipitationProbability: number; // clouds as proxy (0-100)
    humidity: number; // %
    windSpeed: number; // m/s
    windDirection: number; // degrees
    temperature: number; // Celsius
    cloudCover: number; // %
    uvIndex: number; // not in current, set to 0
}

interface OpenWeatherApiResponse {
    weather: { id: number; description: string }[];
    main: {
        temp: number;
        humidity: number;
        feels_like: number;
    };
    wind: {
        speed: number;
        deg: number;
    };
    clouds: {
        all: number;
    };
    rain?: {
        "1h"?: number;
        "3h"?: number;
    };
    dt: number;
    name: string;
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

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    try {
        const res = await fetch(url, {
            next: { revalidate: 300 }, // cache 5 min
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[OpenWeather] Error ${res.status}: ${errText}`);
            return null;
        }

        const json: OpenWeatherApiResponse = await res.json();

        // Convert cloud cover to a precipitation probability proxy
        // Use actual rain if available, otherwise derive from clouds
        const rainMmHr = json.rain?.["1h"] ?? 0;
        const cloudProxy = json.clouds?.all ?? 0; // 0-100

        const data: OpenWeatherData = {
            precipitationIntensity: rainMmHr,
            precipitationProbability: cloudProxy, // proxy when no forecast available
            humidity: json.main?.humidity ?? 0,
            windSpeed: json.wind?.speed ?? 0,
            windDirection: json.wind?.deg ?? 0,
            temperature: json.main?.temp ?? 0,
            cloudCover: json.clouds?.all ?? 0,
            uvIndex: 0, // not in current endpoint
        };

        return { data, raw: json };
    } catch (err) {
        console.error("[OpenWeather] Fetch failed:", err);
        return null;
    }
}
