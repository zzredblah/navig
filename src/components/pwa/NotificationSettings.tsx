'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, MessageSquare, FolderOpen, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import type { PushNotificationSettings } from '@/types/pwa';

export function NotificationSettings() {
  const {
    permission,
    isSubscribed,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [settings, setSettings] = useState<PushNotificationSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch settings
  useEffect(() => {
    if (!isSubscribed) {
      setIsLoadingSettings(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/push/settings');
        if (response.ok) {
          const { data } = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('[Notification] Fetch settings error:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [isSubscribed]);

  const handleToggle = async (key: keyof PushNotificationSettings, value: boolean) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setIsSaving(true);

    try {
      const response = await fetch('/api/push/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        // Revert on error
        setSettings(settings);
      }
    } catch {
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-12 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (permission === 'unsupported') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">알림 미지원</h3>
            <p className="text-sm text-amber-600 mt-1">
              현재 브라우저에서는 푸시 알림을 지원하지 않습니다.
              Chrome, Firefox, Safari 등의 최신 브라우저를 사용해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">알림 차단됨</h3>
            <p className="text-sm text-red-600 mt-1">
              브라우저 설정에서 알림이 차단되어 있습니다.
              브라우저 설정에서 NAVIG의 알림을 허용해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">푸시 알림 활성화</h3>
            <p className="text-sm text-gray-500 mt-1">
              새로운 피드백, 채팅, 프로젝트 업데이트를 실시간으로 받아보세요
            </p>
            {subscriptionError && (
              <p className="text-sm text-red-500 mt-2">{subscriptionError}</p>
            )}
            <Button
              onClick={subscribe}
              disabled={subscriptionLoading}
              size="sm"
              className="mt-3 bg-primary-600 hover:bg-primary-700"
            >
              {subscriptionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  활성화 중...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  알림 활성화
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main toggle */}
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-green-800">푸시 알림 활성화됨</h3>
            <p className="text-sm text-green-600">알림을 받고 있습니다</p>
          </div>
        </div>
        <Button
          onClick={unsubscribe}
          disabled={subscriptionLoading}
          variant="outline"
          size="sm"
        >
          {subscriptionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            '비활성화'
          )}
        </Button>
      </div>

      {/* Notification type settings */}
      {settings && !isLoadingSettings && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="chat-enabled" className="font-medium text-gray-900">
                  채팅 알림
                </Label>
                <p className="text-sm text-gray-500">새 메시지 알림</p>
              </div>
            </div>
            <Switch
              id="chat-enabled"
              checked={settings.chat_enabled}
              onCheckedChange={(value) => handleToggle('chat_enabled', value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="feedback-enabled" className="font-medium text-gray-900">
                  피드백 알림
                </Label>
                <p className="text-sm text-gray-500">새 피드백 및 댓글</p>
              </div>
            </div>
            <Switch
              id="feedback-enabled"
              checked={settings.feedback_enabled}
              onCheckedChange={(value) => handleToggle('feedback_enabled', value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="project-enabled" className="font-medium text-gray-900">
                  프로젝트 알림
                </Label>
                <p className="text-sm text-gray-500">프로젝트 업데이트 및 초대</p>
              </div>
            </div>
            <Switch
              id="project-enabled"
              checked={settings.project_enabled}
              onCheckedChange={(value) => handleToggle('project_enabled', value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="system-enabled" className="font-medium text-gray-900">
                  시스템 알림
                </Label>
                <p className="text-sm text-gray-500">공지사항 및 업데이트</p>
              </div>
            </div>
            <Switch
              id="system-enabled"
              checked={settings.system_enabled}
              onCheckedChange={(value) => handleToggle('system_enabled', value)}
              disabled={isSaving}
            />
          </div>
        </div>
      )}

      {isLoadingSettings && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
