/**
 * TextSMS.co.ke SMS Provider
 * POST https://sms.textsms.co.ke/api/services/sendsms/
 */

export interface SendSmsResult {
    success: boolean;
    recipient?: string;
    messageId?: string;
    cost?: number;
    error?: string;
    raw?: unknown;
}

export function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
    if (digits.startsWith("254")) return digits;
    if (digits.length === 9) return "254" + digits;
    return digits;
}

export function parseIncomingSms(message: string): "NEED_HELP" | "SAFE" | "FREE_TEXT" {
    const text = message.trim().toUpperCase();
    if (text === "1" || text === "HELP" || text === "SOS") return "NEED_HELP";
    if (text === "2" || text === "SAFE" || text === "OK") return "SAFE";
    return "FREE_TEXT";
}

export async function sendSms(to: string | string[], message: string): Promise<SendSmsResult> {
    const apiKey = process.env.SMS_PROVIDER_API_KEY!;
    const partnerId = process.env.SMS_PROVIDER_PARTNER_ID!;
    const senderId = process.env.SMS_PROVIDER_SENDER_ID ?? "TextSMS";
    const baseUrl = process.env.SMS_PROVIDER_BASE_URL ?? "https://sms.textsms.co.ke/api/services/sendsms/";

    const numbers = Array.isArray(to) ? to.map(normalizePhone) : [normalizePhone(to)];
    const recipient = numbers.join(",");

    try {
        const body = {
            apikey: apiKey,
            partnerID: partnerId,
            message,
            shortcode: senderId,
            mobile: recipient,
        };

        const res = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(body),
        });

        const raw = await res.json().catch(() => ({}));

        if (!res.ok) {
            return { success: false, recipient, error: `HTTP ${res.status}`, raw };
        }

        const firstResponse = Array.isArray(raw?.responses) ? raw.responses[0] : undefined;
        const code = firstResponse?.["response-code"] ?? raw?.["response-code"];

        if (code == 200 || code === "200") {
            return {
                success: true,
                recipient,
                messageId: String(firstResponse?.messageid ?? raw?.messageid ?? ""),
                raw,
            };
        }

        return {
            success: false,
            recipient,
            error: firstResponse?.["response-description"] ?? raw?.["response-description"] ?? "Unknown error",
            raw,
        };
    } catch (err) {
        return {
            success: false,
            recipient,
            error: err instanceof Error ? err.message : "Network error",
        };
    }
}

export async function sendBulkSms(
    recipients: string[],
    message: string,
): Promise<{ sent: number; failed: number; results: SendSmsResult[] }> {
    const uniqueRecipients = [...new Set(recipients.map(normalizePhone))];
    const results: SendSmsResult[] = [];

    for (let i = 0; i < uniqueRecipients.length; i += 1) {
        const recipient = uniqueRecipients[i];
        const result = await sendSms(recipient, message);
        results.push({ ...result, recipient });

        if (i + 1 < uniqueRecipients.length) {
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    }

    return {
        sent: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length,
        results,
    };
}
