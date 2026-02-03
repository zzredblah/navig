'use client';

import { useState, useEffect, useCallback } from 'react';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check current permission status
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PermissionState);

    // Check if already subscribed
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('[Push] Check subscription error:', err);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setError('이 브라우저는 알림을 지원하지 않습니다');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      return result === 'granted';
    } catch (err) {
      console.error('[Push] Permission request error:', err);
      setError('알림 권한 요청에 실패했습니다');
      return false;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get VAPID public key from server
      const keyResponse = await fetch('/api/push/vapid-key');
      if (!keyResponse.ok) {
        throw new Error('VAPID key를 가져올 수 없습니다');
      }
      const { data: { publicKey } } = await keyResponse.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          },
        }),
      });

      if (!subscribeResponse.ok) {
        throw new Error('서버에 구독 등록을 실패했습니다');
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      setError(err instanceof Error ? err.message : '구독에 실패했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : '구독 해제에 실패했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
