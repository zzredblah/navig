import { NextResponse } from 'next/server';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push/web-push';

// GET /api/push/vapid-key - Get VAPID public key for client-side subscription
export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'Push notifications not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    data: {
      publicKey: getVapidPublicKey(),
    },
  });
}
