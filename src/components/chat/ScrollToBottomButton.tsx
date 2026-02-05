'use client';

import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollToBottomButtonProps {
  show: boolean;
  newMessageCount: number;
  onClick: () => void;
}

/**
 * 새 메시지 알림 및 하단 스크롤 버튼
 */
export function ScrollToBottomButton({ show, newMessageCount, onClick }: ScrollToBottomButtonProps) {
  if (!show && newMessageCount === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
      <Button
        variant={newMessageCount > 0 ? 'default' : 'secondary'}
        size="sm"
        className={
          newMessageCount > 0
            ? 'rounded-full shadow-lg bg-primary-600 hover:bg-primary-700 text-white px-4'
            : 'rounded-full shadow-lg'
        }
        onClick={onClick}
      >
        <ArrowDown className="h-4 w-4" />
        {newMessageCount > 0 && <span className="ml-1">새 메시지 {newMessageCount}개</span>}
      </Button>
    </div>
  );
}
