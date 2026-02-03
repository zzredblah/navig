'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BeforeInstallPromptEvent, PWAInstallState } from '@/types/pwa';

// Global variable to store the install prompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [installState, setInstallState] = useState<PWAInstallState>('idle');
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallState('installed');
      return;
    }

    // Check if running as TWA
    if (document.referrer.startsWith('android-app://')) {
      setInstallState('installed');
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setInstallState('installable');
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstallState('installed');
      setIsInstallable(false);
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check display mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setInstallState('installed');
        setIsInstallable(false);
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: 'dismissed' as const, platform: '' };
    }

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      if (result.outcome === 'accepted') {
        setInstallState('installed');
        setIsInstallable(false);
      }

      deferredPrompt = null;
      return result;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return { outcome: 'dismissed' as const, platform: '' };
    }
  }, []);

  return {
    installState,
    isInstallable,
    promptInstall,
  };
}

export function usePWAUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates periodically
        const checkForUpdates = () => {
          reg.update().catch(console.error);
        };

        // Check every 60 seconds
        const interval = setInterval(checkForUpdates, 60000);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
              }
            });
          }
        });

        return () => clearInterval(interval);
      });
    }
  }, []);

  const updateApp = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload the page after the new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, [registration]);

  return {
    hasUpdate,
    updateApp,
  };
}

export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check various standalone modes
    const checkStandalone = () => {
      const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
      const isTWA = document.referrer.startsWith('android-app://');

      return isDisplayModeStandalone || isIOSStandalone || isTWA;
    };

    setIsStandalone(checkStandalone());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setIsStandalone(checkStandalone());
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isStandalone;
}
