import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/verify-captcha
 * Server-side hCaptcha verification. Never exposes the secret key to the client.
 */
export async function POST(request: NextRequest) {
  try {
    // In development mode or localhost checking, bypass captcha verification
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || (process.env.NODE_ENV as string) === 'development';
    if (isLocal) {
      return NextResponse.json({ success: true });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Captcha token is required.' },
        { status: 400 }
      );
    }

    const secret = process.env.HCAPTCHA_SECRET_KEY;

    if (!secret) {
      console.error('HCAPTCHA_SECRET_KEY is not set');
      // In development without keys, allow login (only for dev mode)
      if ((process.env.NODE_ENV as string) === 'development') {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const verifyResponse = await fetch(
      'https://api.hcaptcha.com/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
      }
    );

    const data = await verifyResponse.json();

    if (!data.success) {
      console.warn('hCaptcha verification failed:', data['error-codes']);
      return NextResponse.json(
        { error: 'Captcha verification failed. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Captcha verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
