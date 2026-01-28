'use client';

/**
 * 영상 승인 버튼 컴포넌트
 * - 클라이언트만 승인 가능
 * - AlertDialog로 승인 확인
 * - 승인 취소 가능
 */

import { useState } from 'react';
import { Check, CheckCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface ApprovalButtonProps {
  videoId: string;
  projectClientId: string;
  currentUserId?: string;
  currentUserRole?: string; // 현재 사용자의 프로젝트 역할
  isApproved: boolean;
  approvedAt?: string | null;
  onApprovalChange?: (approved: boolean) => void;
  size?: 'sm' | 'default' | 'lg';
}

export function ApprovalButton({
  videoId,
  projectClientId,
  currentUserId,
  currentUserRole,
  isApproved,
  approvedAt,
  onApprovalChange,
  size = 'sm',
}: ApprovalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [approved, setApproved] = useState(isApproved);

  // 승인 권한 확인: 소유자(owner) 또는 승인자(approver) 역할
  const isOwner = currentUserId === projectClientId || currentUserRole === 'owner';
  const isApprover = currentUserRole === 'approver';
  const canApprove = isOwner || isApprover;

  // 승인 권한이 없으면 승인 상태만 표시
  if (!canApprove) {
    if (approved) {
      return (
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">승인됨</span>
          {approvedAt && (
            <span className="text-xs text-gray-500 ml-1">
              ({new Date(approvedAt).toLocaleDateString('ko-KR')})
            </span>
          )}
        </div>
      );
    }
    return null;
  }

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/approve`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setApproved(true);
        onApprovalChange?.(true);
        toast({
          title: '영상 승인 완료',
          description: '영상이 승인되었습니다. 업로더에게 알림이 전송됩니다.',
        });
      } else {
        const json = await response.json();
        throw new Error(json.error);
      }
    } catch (error) {
      toast({
        title: '승인 실패',
        description: error instanceof Error ? error.message : '승인 처리에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelApproval = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/approve`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApproved(false);
        onApprovalChange?.(false);
        toast({
          title: '승인 취소',
          description: '영상 승인이 취소되었습니다.',
        });
      } else {
        const json = await response.json();
        throw new Error(json.error);
      }
    } catch (error) {
      toast({
        title: '승인 취소 실패',
        description: error instanceof Error ? error.message : '승인 취소에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (approved) {
    // 승인된 상태 - 취소 버튼
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            승인됨
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>승인을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              영상 승인을 취소하면 작업자에게 수정이 필요하다는 의미로 전달됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelApproval}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              승인 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 미승인 상태 - 승인 버튼
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="default"
          size={size}
          className="gap-1.5 bg-green-600 hover:bg-green-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          승인하기
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>영상을 승인하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 영상 버전을 승인하면 작업자에게 알림이 전송됩니다.
            승인 후에도 취소할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            승인하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
