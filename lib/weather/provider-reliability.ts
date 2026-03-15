import { prisma } from "@/lib/db/prisma";

type ProviderName = "TOMORROW_IO" | "OPENWEATHER";

const PROVIDER_ID_BY_NAME: Record<ProviderName, string> = {
    TOMORROW_IO: "wp-tomorrow",
    OPENWEATHER: "wp-openweather",
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RETRIES = 2;
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 15 * 60 * 1000;

async function getProviderConfig(provider: ProviderName) {
    return prisma.weatherProviderConfig.findUnique({
        where: { id: PROVIDER_ID_BY_NAME[provider] },
        select: {
            id: true,
            isActive: true,
            timeoutMs: true,
            maxRetries: true,
            consecutiveFailures: true,
            successCount: true,
            failureCount: true,
            circuitState: true,
            cooldownUntil: true,
            lastSuccessfulAt: true,
            lastFailureAt: true,
            lastCheckedAt: true,
            lastError: true,
        },
    });
}

function isCircuitBlocked(config: Awaited<ReturnType<typeof getProviderConfig>>) {
    if (!config || config.circuitState !== "OPEN") return false;
    return config.cooldownUntil ? config.cooldownUntil > new Date() : false;
}

async function recordSuccess(provider: ProviderName, responseMs: number) {
    const configId = PROVIDER_ID_BY_NAME[provider];
    const checkedAt = new Date();

    await prisma.$transaction([
        prisma.weatherProviderConfig.update({
            where: { id: configId },
            data: {
                consecutiveFailures: 0,
                successCount: { increment: 1 },
                circuitState: "CLOSED",
                circuitOpenedAt: null,
                cooldownUntil: null,
                lastCheckedAt: checkedAt,
                lastSuccessfulAt: checkedAt,
                lastError: null,
            },
        }),
        prisma.systemHealthCheck.create({
            data: {
                service: provider === "TOMORROW_IO" ? "tomorrow_io_api" : "openweather_api",
                status: "UP",
                responseMs,
                message: `${provider} request succeeded`,
            },
        }),
    ]);
}

async function recordFailure(provider: ProviderName, errorMessage: string, responseMs: number | null, nextFailureCount?: number) {
    const configId = PROVIDER_ID_BY_NAME[provider];
    const checkedAt = new Date();
    const current = await prisma.weatherProviderConfig.findUnique({
        where: { id: configId },
        select: { consecutiveFailures: true },
    });
    const consecutiveFailures = nextFailureCount ?? (current?.consecutiveFailures ?? 0) + 1;
    const shouldOpenCircuit = consecutiveFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD;

    await prisma.$transaction([
        prisma.weatherProviderConfig.update({
            where: { id: configId },
            data: {
                consecutiveFailures,
                failureCount: { increment: 1 },
                circuitState: shouldOpenCircuit ? "OPEN" : "CLOSED",
                circuitOpenedAt: shouldOpenCircuit ? checkedAt : null,
                cooldownUntil: shouldOpenCircuit ? new Date(Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS) : null,
                lastCheckedAt: checkedAt,
                lastFailureAt: checkedAt,
                lastError: errorMessage.slice(0, 500),
            },
        }),
        prisma.systemHealthCheck.create({
            data: {
                service: provider === "TOMORROW_IO" ? "tomorrow_io_api" : "openweather_api",
                status: "DOWN",
                responseMs: responseMs ?? 0,
                message: shouldOpenCircuit
                    ? `${provider} circuit opened after repeated failures: ${errorMessage}`
                    : `${provider} request failed: ${errorMessage}`,
            },
        }),
    ]);
}

export async function fetchWithProviderReliability(provider: ProviderName, url: string): Promise<Response | null> {
    const config = await getProviderConfig(provider);

    if (!config?.isActive) {
        console.warn(`[${provider}] Provider disabled or missing config`);
        return null;
    }

    if (isCircuitBlocked(config)) {
        console.warn(`[${provider}] Circuit open until ${config.cooldownUntil?.toISOString()}`);
        return null;
    }

    if (config.circuitState === "OPEN") {
        await prisma.weatherProviderConfig.update({
            where: { id: config.id },
            data: {
                circuitState: "HALF_OPEN",
                lastCheckedAt: new Date(),
            },
        });
    }

    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    let lastError = "Unknown weather provider failure";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const startedAt = Date.now();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                next: { revalidate: 300 },
            });
            clearTimeout(timeout);

            const responseMs = Date.now() - startedAt;
            if (!response.ok) {
                lastError = `HTTP ${response.status}`;
                if (attempt === maxRetries) {
                    await recordFailure(provider, lastError, responseMs, config.consecutiveFailures + 1);
                    return null;
                }
                continue;
            }

            await recordSuccess(provider, responseMs);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            lastError = error instanceof Error ? error.message : String(error);

            if (attempt === maxRetries) {
                await recordFailure(provider, lastError, null, config.consecutiveFailures + 1);
                return null;
            }
        }
    }

    return null;
}
