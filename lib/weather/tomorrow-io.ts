// Tomorrow.io Weather API Service
// Docs: https://docs.tomorrow.io/reference/weather-realtime

export interface TomorrowWeatherData {
    precipitationIntensity: number; // mm/hr
    precipitationProbability: number; // 0-100
    humidity: number; // %
    windSpeed: number; // m/s
    windDirection: number;
    temperature: number; // Celsius
    cloudCover: number; // %
    uvIndex: number;
}

interface TomorrowApiResponse {
    data: {
        time: string;
        values: {
            precipitationIntensity: number;
            precipitationProbability: number;
            humidity: number;
            windSpeed: number;
            windDirection: number;
            temperature: number;
            cloudCover: number;
            uvIndex: number;
        };
        location: {
            lat: number;
            lon: number;
        };
    };
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

    const fields = [
        "precipitationIntensity",
        "precipitationProbability",
        "humidity",
        "windSpeed",
        "windDirection",
        "temperature",
        "cloudCover",
        "uvIndex",
    ].join(",");

    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&fields=${fields}&units=metric&apikey=${apiKey}`;

    try {
        const res = await fetch(url, {
            next: { revalidate: 300 }, // cache 5 min
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[Tomorrow.io] Error ${res.status}: ${errText}`);
            return null;
        }

        const json: TomorrowApiResponse = await res.json();
        const v = json.data.values;

        const data: TomorrowWeatherData = {
            precipitationIntensity: v.precipitationIntensity ?? 0,
            precipitationProbability: v.precipitationProbability ?? 0,
            humidity: v.humidity ?? 0,
            windSpeed: v.windSpeed ?? 0,
            windDirection: v.windDirection ?? 0,
            temperature: v.temperature ?? 0,
            cloudCover: v.cloudCover ?? 0,
            uvIndex: v.uvIndex ?? 0,
        };

        return { data, raw: json };
    } catch (err) {
        console.error("[Tomorrow.io] Fetch failed:", err);
        return null;
    }
}
