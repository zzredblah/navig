'use client';

/**
 * 피드백 템플릿 선택 드롭다운
 */

import { useState, useEffect } from 'react';
import { ChevronDown, FileText, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeedbackTemplate } from '@/types/feedback-template';

interface FeedbackTemplateSelectProps {
  onSelect: (template: FeedbackTemplate) => void;
  onManageClick?: () => void;
  refreshTrigger?: number; // 이 값이 바뀌면 템플릿 다시 로드
}

export function FeedbackTemplateSelect({
  onSelect,
  onManageClick,
  refreshTrigger,
}: FeedbackTemplateSelectProps) {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/feedback-templates');
        if (response.ok) {
          const json = await response.json();
          setTemplates(json.data || []);
        }
      } catch (error) {
        console.error('템플릿 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      fetchTemplates();
    }
  }, [mounted, refreshTrigger]); // refreshTrigger 변경 시 다시 로드

  // Hydration 에러 방지
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="gap-1 text-xs">
        <FileText className="h-3.5 w-3.5" />
        템플릿
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <FileText className="h-3.5 w-3.5" />
          템플릿
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {isLoading ? (
          <div className="px-2 py-3 text-center text-sm text-gray-500">
            로딩 중...
          </div>
        ) : templates.length === 0 ? (
          <div className="px-2 py-3 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">템플릿이 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">
              자주 사용하는 피드백을 저장하세요
            </p>
          </div>
        ) : (
          templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => onSelect(template)}
              className="cursor-pointer"
            >
              <div className="flex items-start gap-2 w-full">
                {template.is_urgent && (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {template.title}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {template.content}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        {onManageClick && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onManageClick} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              템플릿 관리
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
