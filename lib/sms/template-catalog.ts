import {
    allClearTemplate,
    earlyWarningTemplate,
    evacuationTemplate,
    rescueFollowUpTemplate,
    safeZoneTemplate,
    severeFloodTemplate,
} from "@/lib/sms/sms-templates";

export interface SmsTemplateDefinition {
    id: string;
    name: string;
    category: "Warning" | "Critical" | "Info" | "Advisory";
    status: "active";
    body: string;
    description: string;
}

const SAMPLE_TEMPLATE_DATA = {
    locationName: "Nairobi Area",
    time: "6:30 PM",
    period: "through the night",
    shelterName: "Moi Avenue Shelter",
    shelterAddress: "Moi Avenue, Nairobi",
    rescuePhone: "0800 723 453",
    safeLocation: "Moi Avenue Shelter",
};

export const SMS_TEMPLATE_CATALOG: SmsTemplateDefinition[] = [
    {
        id: "early-warning",
        name: "Early Warning Alert",
        category: "Warning",
        status: "active",
        description: "Heads-up alert for rising flood risk before severe impact.",
        body: earlyWarningTemplate(SAMPLE_TEMPLATE_DATA),
    },
    {
        id: "severe-flood",
        name: "Severe Flood Alert",
        category: "Critical",
        status: "active",
        description: "Immediate danger alert for active flooding.",
        body: severeFloodTemplate(SAMPLE_TEMPLATE_DATA),
    },
    {
        id: "evacuation",
        name: "Evacuation Order",
        category: "Critical",
        status: "active",
        description: "Official move-to-safety instruction for at-risk residents.",
        body: evacuationTemplate(SAMPLE_TEMPLATE_DATA),
    },
    {
        id: "safe-zone",
        name: "Safe Zone Information",
        category: "Info",
        status: "active",
        description: "Guidance to shelters and safe locations.",
        body: safeZoneTemplate(SAMPLE_TEMPLATE_DATA),
    },
    {
        id: "all-clear",
        name: "All Clear Notice",
        category: "Info",
        status: "active",
        description: "Return-home guidance once the danger has passed.",
        body: allClearTemplate(SAMPLE_TEMPLATE_DATA),
    },
    {
        id: "rescue-followup",
        name: "Rescue Follow-Up",
        category: "Advisory",
        status: "active",
        description: "Acknowledgement after a distress reply is received.",
        body: rescueFollowUpTemplate(SAMPLE_TEMPLATE_DATA),
    },
];
