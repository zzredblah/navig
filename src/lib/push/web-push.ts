import webpush from 'web-push';

// VAPID keys 설정
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@navig.app';

// web-push 설정
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[Push] VAPID keys not configured');
    return { success: false, error: 'VAPID keys not configured' };
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      tag: payload.tag,
      data: payload.data || {},
      actions: payload.actions || [],
    });

    await webpush.sendNotification(pushSubscription, notificationPayload);
    return { success: true };
  } catch (error) {
    console.error('[Push] Failed to send notification:', error);

    // Handle expired subscriptions
    // WebPushError has statusCode property but TypeScript doesn't know about it
    const webPushError = error as { statusCode?: number; message?: string };
    if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
      return { success: false, error: 'subscription_expired' };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}
