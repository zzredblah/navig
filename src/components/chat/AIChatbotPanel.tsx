'use client';

/**
 * AI 챗봇 패널
 *
 * 헤더에서 열리는 슬라이딩 패널 형태의 AI 챗봇
 * 계정 기반으로 모든 프로젝트, 피드백 정보에 접근 가능
 */

import { useEffect } from 'react';
import { X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIChatbot } from './AIChatbot';
import { cn } from '@/lib/utils';

interface AIChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatbotPanel({ isOpen, onClose }: AIChatbotPanelProps) {
  // ESC 키로 패널 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* 배경 오버레이 (모바일에서만) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* AI 챗봇 패널 */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl z-50 transition-transform duration-300 ease-in-out',
          'w-full sm:w-96',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">AI 도우미</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* AI 챗봇 본문 */}
        <div className="h-[calc(100%-3.5rem)] overflow-hidden flex flex-col">
          <AIChatbotContent />
        </div>
      </div>
    </>
  );
}

/**
 * AI 챗봇 본문 컴포넌트 (패널 내부용)
 * 항상 펼쳐진 상태로 표시, 전체 높이 사용
 */
function AIChatbotContent() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <AIChatbot isPanel={false} defaultExpanded={true} fullHeight={true} />
    </div>
  );
}
