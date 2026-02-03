'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Bell, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationSettings } from '@/components/pwa';
import { usePWAInstall, useIsStandalone } from '@/hooks/use-pwa';

interface PushSubscriptionInfo {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

export default function NotificationSettingsPage() {
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isInstallable, promptInstall, installState } = usePWAInstall();
  const isStandalone = useIsStandalone();

  useEffect(() => {
    setMounted(true);

    // Fetch subscriptions
    const fetchSubscriptions = async () => {
      try {
        const response = await fetch('/api/push/subscribe');
        if (response.ok) {
          const { data } = await response.json();
          setSubscriptions(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleRemoveDevice = async (id: string) => {
    // This would need an endpoint to remove a specific subscription by ID
    // For now, just filter it from the list
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          설정으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">알림 설정</h1>
        <p className="text-gray-500 mt-1">
          푸시 알림 및 알림 기본 설정을 관리합니다
        </p>
      </div>

      <div className="space-y-6">
        {/* PWA Install Card (if not installed) */}
        {mounted && !isStandalone && isInstallable && (
          <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">앱으로 설치</h3>
                <p className="text-sm text-gray-600 mt-1">
                  NAVIG를 앱으로 설치하면 더 빠르게 접근하고 푸시 알림을 안정적으로 받을 수 있습니다
                </p>
                <Button
                  onClick={promptInstall}
                  size="sm"
                  className="mt-3 bg-primary-600 hover:bg-primary-700"
                >
                  앱 설치하기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Installed status */}
        {mounted && isStandalone && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">앱으로 사용 중</h3>
                <p className="text-sm text-green-600">
                  NAVIG 앱으로 사용 중입니다
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Push Notification Settings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">푸시 알림</h2>
          <NotificationSettings />
        </div>

        {/* Registered Devices */}
        {subscriptions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">등록된 기기</h2>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {sub.device_name || '알 수 없는 기기'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sub.last_used_at
                          ? `마지막 사용: ${new Date(sub.last_used_at).toLocaleDateString('ko-KR')}`
                          : `등록: ${new Date(sub.created_at).toLocaleDateString('ko-KR')}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDevice(sub.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}
