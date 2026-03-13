// GET /api/ably/auth — issue short-lived Ably tokens for authenticated clients
import { NextRequest, NextResponse } from 'next/server';
import { createAblyToken } from '@/lib/realtime/ably';

export async function GET(req: NextRequest) {
    const clientId = req.nextUrl.searchParams.get('clientId') ?? 'anonymous';
    try {
        const token = await createAblyToken(clientId);
        return NextResponse.json(token);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to create Ably token' }, { status: 500 });
    }
}
