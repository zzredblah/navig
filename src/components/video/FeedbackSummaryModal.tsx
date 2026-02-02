'use client';

import { X, Sparkles, AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FeedbackStats {
  total: number;
  resolved: number;
  urgent: number;
  open: number;
}

interface FeedbackSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  stats: FeedbackStats;
  remaining?: number;
}

export function FeedbackSummaryModal({
  isOpen,
  onClose,
  summary,
  stats,
  remaining,
}: FeedbackSummaryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" />
            AI 피드백 요약
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <MessageSquare className="h-5 w-5 text-gray-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">전체 피드백</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-green-700">{stats.resolved}</p>
              <p className="text-xs text-green-600">해결됨</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-orange-700">{stats.open}</p>
              <p className="text-xs text-orange-600">진행 중</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-red-700">{stats.urgent}</p>
              <p className="text-xs text-red-600">긴급</p>
            </div>
          </div>

          {/* 요약 내용 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">분석 결과</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>
          </div>

          {/* 남은 사용량 */}
          {remaining !== undefined && (
            <p className="text-xs text-gray-500 text-center">
              이번 달 남은 AI 요약 횟수: {remaining === -1 ? '무제한' : `${remaining}회`}
            </p>
          )}
        </div>

        <div className="shrink-0 pt-4 border-t border-gray-100">
          <Button onClick={onClose} className="w-full">
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
