import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/verify-turnstile
 * Server-side Cloudflare Turnstile verification. Never exposes the secret key to the client.
 */
export async function POST(request: NextRequest) {
  try {
    // In development mode or localhost checking, bypass verification
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || (process.env.NODE_ENV as string) === 'development';
    if (isLocal) {
      return NextResponse.json({ success: true });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required.' },
        { status: 400 }
      );
    }

    // Default to the Cloudflare always-pass secret key if not set
    const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: request.headers.get('x-forwarded-for') || '',
        }),
      }
    );

    const data = await verifyResponse.json();

    if (!data.success) {
      console.warn('Turnstile verification failed:', data['error-codes']);
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Turnstile verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
