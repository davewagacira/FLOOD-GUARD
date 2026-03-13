// SMS Templates — Human-centered disaster messaging
// Style: Clear, localized, time-specific, short, easy to read

export interface AlertTemplateData {
    locationName: string;
    time?: string;          // e.g. "5:00 PM"
    period?: string;        // e.g. "through the evening"
    shelterName?: string;
    shelterAddress?: string;
    rescuePhone?: string;
    safeLocation?: string;
}

/**
 * Early Warning Alert
 * Sent when risk = HIGH, probability is rising but flooding not yet occurring
 */
export function earlyWarningTemplate(data: AlertTemplateData): string {
    const time = data.time ? ` starting around ${data.time}` : "";
    const period = data.period ? ` and continuing ${data.period}` : "";

    return `FloodGuard Alert
Heavy rainfall is expected near ${data.locationName}${time}${period}. Flooding may occur in low-lying areas. Move to higher ground if needed.

Reply 1 if you need help
Reply 2 if you are safe`;
}

/**
 * Severe Flood Alert
 * Sent when risk = CRITICAL, immediate danger
 */
export function severeFloodTemplate(data: AlertTemplateData): string {
    const shelterInfo = data.shelterName
        ? `\nNearest shelter: ${data.shelterName}${data.shelterAddress ? " at " + data.shelterAddress : ""}`
        : "";

    return `⚠️ FLOOD ALERT - ${data.locationName}
Critical flooding is occurring now. Water levels are rising rapidly.
Evacuate immediately to higher ground.${shelterInfo}

Reply 1 if you need help
Reply 2 if you are safe`;
}

/**
 * Evacuation Guidance
 * Sent when authorities issue evacuation order
 */
export function evacuationTemplate(data: AlertTemplateData): string {
    const shelter = data.safeLocation || data.shelterName || "the nearest high ground";
    const phone = data.rescuePhone ? `\n\nCall ${data.rescuePhone} for emergency support.` : "";

    return `EVACUATION ORDER - ${data.locationName}
Please leave your home now and move to ${shelter}.
Rescue teams are en route.${phone}

Reply 1 if you need evacuation assistance`;
}

/**
 * Rescue Follow-Up
 * Sent after receiving a distress signal (NEED_HELP reply)
 */
export function rescueFollowUpTemplate(data: AlertTemplateData): string {
    const phone = data.rescuePhone || "0800-FLOOD";
    return `FloodGuard Rescue
We have received your distress signal near ${data.locationName}.
A rescue team has been dispatched to your area.

Stay in a safe elevated location and call ${phone} if you need immediate assistance.`;
}

/**
 * Safe Zone Direction
 * Directs citizens to the nearest safe zone or shelter
 */
export function safeZoneTemplate(data: AlertTemplateData): string {
    const dest = data.shelterName || "the nearest safe zone";
    const address = data.shelterAddress ? ` at ${data.shelterAddress}` : "";

    return `FloodGuard Safety
Flooding has been reported near ${data.locationName}.
Please proceed to ${dest}${address} immediately.

This location has food, water and medical support.
Reply 1 if you need assistance getting there.`;
}

/**
 * All-Clear / Safe Status Confirmation
 */
export function allClearTemplate(data: AlertTemplateData): string {
    return `FloodGuard Update
Water levels near ${data.locationName} are receding.
You may return to your home when authorities confirm it is safe.

Stay alert for further updates from FloodGuard.`;
}
