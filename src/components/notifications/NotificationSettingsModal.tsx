'use client';

import { useState, useEffect } from 'react';
import { Loader2, Bell, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotificationSettings } from '@/hooks/use-notification-settings';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettingsModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationSettingsModal({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: NotificationSettingsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { settings, isLoading, updateSettings, isUpdating } = useNotificationSettings();
  const { toast } = useToast();

  // Controlled vs Uncontrolled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange : setInternalOpen;

  // 로컬 상태 (폼 입력용)
  const [localSettings, setLocalSettings] = useState({
    email_new_feedback: true,
    email_urgent_feedback: true,
    email_version_upload: true,
    email_document_status: false,
    email_deadline_reminder: true,
    email_chat_message: false,
    inapp_enabled: true,
  });

  // 설정 로드 시 로컬 상태 동기화
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        email_new_feedback: settings.email_new_feedback,
        email_urgent_feedback: settings.email_urgent_feedback,
        email_version_upload: settings.email_version_upload,
        email_document_status: settings.email_document_status,
        email_deadline_reminder: settings.email_deadline_reminder,
        email_chat_message: settings.email_chat_message,
        inapp_enabled: settings.inapp_enabled,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings, {
      onSuccess: () => {
        toast({
          title: '설정이 저장되었습니다',
          description: '알림 설정이 성공적으로 변경되었습니다.',
        });
        onOpenChange?.(false);
      },
      onError: () => {
        toast({
          title: '설정 저장 실패',
          description: '알림 설정 변경에 실패했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>알림 설정</DialogTitle>
          <DialogDescription>
            받고 싶은 알림 유형을 선택하세요. 이메일 알림과 인앱 알림을 개별적으로 설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 인앱 알림 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Bell className="h-4 w-4" />
                인앱 알림
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="inapp_enabled" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900">인앱 알림 활성화</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    사이트 내에서 알림을 받습니다
                  </div>
                </Label>
                <Switch
                  id="inapp_enabled"
                  checked={localSettings.inapp_enabled}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({ ...prev, inapp_enabled: checked }))
                  }
                />
              </div>
            </div>

            {/* 이메일 알림 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 pt-4 border-t border-gray-200">
                <Mail className="h-4 w-4" />
                이메일 알림
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email_new_feedback" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">새 피드백</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      영상에 새로운 피드백이 등록되면 알림
                    </div>
                  </Label>
                  <Switch
                    id="email_new_feedback"
                    checked={localSettings.email_new_feedback}
                    onCheckedChange={(checked) =>
                      setLocalSettings((prev) => ({ ...prev, email_new_feedback: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_urgent_feedback" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">긴급 피드백</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      긴급 피드백이 등록되면 즉시 알림
                    </div>
                  </Label>
                  <Switch
                    id="email_urgent_feedback"
                    checked={localSettings.email_urgent_feedback}
                    onCheckedChange={(checked) =>
                      setLocalSettings((prev) => ({ ...prev, email_urgent_feedback: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_version_upload" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">새 버전 업로드</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      새로운 영상 버전이 업로드되면 알림
                    </div>
                  </Label>
                  <Switch
                    id="email_version_upload"
                    checked={localSettings.email_version_upload}
                    onCheckedChange={(checked) =>
                      setLocalSettings((prev) => ({ ...prev, email_version_upload: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_document_status" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">문서 상태 변경</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      문서 상태가 변경되면 알림
                    </div>
                  </Label>
                  <Switch
                    id="email_document_status"
                    checked={localSettings.email_document_status}
                    onCheckedChange={(checked) =>
                      setLocalSettings((prev) => ({ ...prev, email_document_status: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_deadline_reminder" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">마감 알림</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      프로젝트 마감일이 다가오면 알림
                    </div>
                  </Label>
                  <Switch
                    id="email_deadline_reminder"
                    checked={localSettings.email_deadline_reminder}
                    onCheckedChange={(checked) =>
                      setLocalSettings((prev) => ({ ...prev, email_deadline_reminder: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_chat_message" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">채팅 메시지</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      새로운 채팅 메시지가 도착하면 알림
                    </div>
                  </Label>
                  <Switch
                    id="email_chat_message"
                    checked={localSettings.email_chat_message}
                    onCheckedChange={(checked) =>
                      setLocalSettings((prev) => ({ ...prev, email_chat_message: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={isUpdating}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
