// GET /api/sms/test — send a real SMS to verify TextSMS credentials
import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/sms/sms-provider';

export async function GET(req: NextRequest) {
    const to = req.nextUrl.searchParams.get('to') ?? '+254700000000';

    const result = await sendSms(to,
        `FloodGuard Test SMS ✓ - TextSMS integration working. Platform: ${process.env.APP_BASE_URL ?? 'localhost:3000'}. Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
    );

    return NextResponse.json({
        ...result,
        sentTo: to,
        config: {
            url: process.env.SMS_PROVIDER_BASE_URL,
            senderID: process.env.SMS_PROVIDER_SENDER_ID,
            partnerID: process.env.SMS_PROVIDER_PARTNER_ID,
            apiKeySet: !!process.env.SMS_PROVIDER_API_KEY,
        },
    });
}
