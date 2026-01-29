'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';
import { createProjectSchema, type CreateProjectInput } from '@/lib/validations/project';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UsageInfo {
  current: number;
  limit: number;
  allowed: boolean;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  });

  // 모달 열릴 때 사용량 체크
  useEffect(() => {
    if (isOpen) {
      checkProjectUsage();
    }
  }, [isOpen]);

  const checkProjectUsage = async () => {
    setIsCheckingUsage(true);
    try {
      const response = await fetch('/api/subscriptions/me');
      if (response.ok) {
        const { data } = await response.json();
        const usage = data.usage;
        const limits = data.limits;

        const current = usage.projects_count;
        const limit = limits.max_projects;
        const allowed = limit === -1 || current < limit;

        setUsageInfo({ current, limit, allowed });

        // 제한 초과 시 업그레이드 모달 표시
        if (!allowed) {
          setShowUpgradeModal(true);
        }
      }
    } catch (error) {
      console.error('사용량 확인 실패:', error);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const onSubmit = async (data: CreateProjectInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // 사용량 초과 에러인 경우 업그레이드 모달 표시
        if (result.code === 'USAGE_LIMIT_EXCEEDED') {
          setShowUpgradeModal(true);
          return;
        }
        setError(result.error || '프로젝트 생성에 실패했습니다');
        return;
      }

      reset();
      onSuccess();

      // 사이드바 사용량 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('usage-updated'));
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  // 사용량 초과 시 업그레이드 모달만 표시 (생성 폼 대신)
  if (isOpen && showUpgradeModal && usageInfo && !usageInfo.allowed) {
    return (
      <UpgradePromptModal
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setShowUpgradeModal(false);
            setUsageInfo(null);
            handleClose();
          }
        }}
        title="프로젝트 생성 제한"
        message={`현재 플랜에서는 최대 ${usageInfo.limit}개의 프로젝트만 생성할 수 있습니다. (현재 ${usageInfo.current}개 사용 중)`}
        feature="더 많은 프로젝트 생성"
      />
    );
  }

  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 프로젝트</DialogTitle>
          {!isCheckingUsage && (
            <DialogDescription>
              새로운 프로젝트를 만들어 협업을 시작하세요
              {usageInfo && usageInfo.limit !== -1 && (
                <span className="block mt-1 text-xs text-gray-400">
                  프로젝트 {usageInfo.current} / {usageInfo.limit}개 사용 중
                </span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* 사용량 체크 중 로딩 표시 */}
        {isCheckingUsage ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
            <p className="text-sm text-gray-500">사용량 확인 중...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 rounded-md bg-error-50 border border-error-200 text-error-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">프로젝트 제목</Label>
                <Input
                  id="title"
                  placeholder="프로젝트 제목을 입력하세요"
                  disabled={isLoading}
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-error-500">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  placeholder="프로젝트에 대한 설명을 입력하세요"
                  rows={3}
                  disabled={isLoading}
                  {...register('description')}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  취소
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    '생성'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
