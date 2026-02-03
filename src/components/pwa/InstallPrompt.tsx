'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall, useIsStandalone } from '@/hooks/use-pwa';

interface InstallPromptProps {
  className?: string;
}

export function InstallPrompt({ className }: InstallPromptProps) {
  const { isInstallable, promptInstall } = usePWAInstall();
  const isStandalone = useIsStandalone();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if previously dismissed (for 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result.outcome === 'accepted') {
      // Track installation
      console.log('[PWA] App installed');
    }
  };

  // Don't render on server or if already installed/dismissed/not installable
  if (!mounted || isStandalone || isDismissed || !isInstallable) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 animate-in slide-in-from-bottom-4 ${className || ''}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
          <Smartphone className="h-6 w-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            NAVIG 앱 설치
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            홈 화면에 추가하면 더 빠르게 접근할 수 있어요
          </p>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Download className="h-4 w-4 mr-1.5" />
              설치하기
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
            >
              나중에
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// iOS Install Guide (iOS doesn't support beforeinstallprompt)
export function IOSInstallGuide({ className }: InstallPromptProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isStandalone = useIsStandalone();

  useEffect(() => {
    setMounted(true);

    // Check if iOS Safari
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    setIsIOS(isIOSDevice && isSafari);

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem('ios-install-guide-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('ios-install-guide-dismissed', Date.now().toString());
  };

  if (!mounted || isStandalone || isDismissed || !isIOS) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 animate-in slide-in-from-bottom-4 ${className || ''}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
          <Smartphone className="h-6 w-6 text-white" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            홈 화면에 추가
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Safari에서{' '}
            <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 rounded">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4L12 16M12 4L8 8M12 4L16 8M4 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
            {' '}버튼을 누른 후 &quot;홈 화면에 추가&quot;를 선택하세요
          </p>

          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
