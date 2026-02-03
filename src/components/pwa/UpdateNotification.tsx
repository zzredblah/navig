'use client';

import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/use-pwa';
import { useState, useEffect } from 'react';

export function UpdateNotification() {
  const { hasUpdate, updateApp } = usePWAUpdate();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !hasUpdate || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-primary-600 text-white rounded-xl shadow-xl p-4 z-50 animate-in slide-in-from-top-4">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <RefreshCw className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-0.5">
            새 버전 사용 가능
          </h3>
          <p className="text-sm text-white/80">
            앱을 업데이트하면 새로운 기능을 사용할 수 있습니다
          </p>
        </div>

        <Button
          onClick={updateApp}
          size="sm"
          variant="secondary"
          className="shrink-0 bg-white text-primary-600 hover:bg-white/90"
        >
          업데이트
        </Button>
      </div>
    </div>
  );
}
