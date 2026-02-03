'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SubtitleSegment, QualityIssue } from '@/types/subtitle';
import { QUALITY_THRESHOLDS, formatSubtitleTime } from '@/types/subtitle';

interface SubtitleQualityCheckProps {
  segments: SubtitleSegment[];
  onIssueClick: (segmentId: string) => void;
  className?: string;
}

export function SubtitleQualityCheck({
  segments,
  onIssueClick,
  className,
}: SubtitleQualityCheckProps) {
  // Analyze segments for quality issues
  const issues = useMemo<QualityIssue[]>(() => {
    const result: QualityIssue[] = [];

    segments.forEach((segment, index) => {
      // Check for low confidence
      if (
        segment.confidence !== null &&
        segment.confidence < QUALITY_THRESHOLDS.MIN_CONFIDENCE
      ) {
        result.push({
          segmentId: segment.id,
          type: 'low_confidence',
          message: `낮은 신뢰도 (${Math.round(segment.confidence * 100)}%)`,
          severity: segment.confidence < 0.5 ? 'error' : 'warning',
        });
      }

      // Check for empty text
      if (!segment.text.trim()) {
        result.push({
          segmentId: segment.id,
          type: 'empty',
          message: '빈 텍스트',
          severity: 'error',
        });
      }

      // Check for duration issues
      const duration = segment.end_time - segment.start_time;

      if (duration > QUALITY_THRESHOLDS.MAX_SEGMENT_DURATION) {
        result.push({
          segmentId: segment.id,
          type: 'too_long',
          message: `너무 긴 세그먼트 (${duration.toFixed(1)}초)`,
          severity: 'warning',
        });
      }

      if (duration < QUALITY_THRESHOLDS.MIN_SEGMENT_DURATION) {
        result.push({
          segmentId: segment.id,
          type: 'too_short',
          message: `너무 짧은 세그먼트 (${duration.toFixed(2)}초)`,
          severity: 'warning',
        });
      }

      // Check for timing overlap with next segment
      if (index < segments.length - 1) {
        const nextSegment = segments[index + 1];
        if (segment.end_time > nextSegment.start_time) {
          result.push({
            segmentId: segment.id,
            type: 'overlap',
            message: '다음 세그먼트와 시간 겹침',
            severity: 'error',
          });
        }
      }
    });

    return result;
  }, [segments]);

  // Group issues by type
  const groupedIssues = useMemo(() => {
    const groups: Record<string, QualityIssue[]> = {
      low_confidence: [],
      overlap: [],
      empty: [],
      too_long: [],
      too_short: [],
    };

    issues.forEach((issue) => {
      groups[issue.type].push(issue);
    });

    return groups;
  }, [issues]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const hasNoIssues = issues.length === 0;

  const issueTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    low_confidence: { label: '낮은 신뢰도', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> },
    overlap: { label: '시간 겹침', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
    empty: { label: '빈 텍스트', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
    too_long: { label: '긴 세그먼트', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> },
    too_short: { label: '짧은 세그먼트', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> },
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div
        className={cn(
          'p-4 rounded-lg',
          hasNoIssues
            ? 'bg-green-50 border border-green-200'
            : errorCount > 0
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        )}
      >
        <div className="flex items-center gap-3">
          {hasNoIssues ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">품질 검사 통과</p>
                <p className="text-sm text-green-600">
                  발견된 문제가 없습니다
                </p>
              </div>
            </>
          ) : (
            <>
              {errorCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <p
                  className={cn(
                    'font-medium',
                    errorCount > 0 ? 'text-red-800' : 'text-yellow-800'
                  )}
                >
                  {issues.length}개 문제 발견
                </p>
                <p
                  className={cn(
                    'text-sm',
                    errorCount > 0 ? 'text-red-600' : 'text-yellow-600'
                  )}
                >
                  {errorCount > 0 && `오류 ${errorCount}개`}
                  {errorCount > 0 && warningCount > 0 && ', '}
                  {warningCount > 0 && `경고 ${warningCount}개`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Issue list by type */}
      {!hasNoIssues && (
        <div className="space-y-3">
          {Object.entries(groupedIssues).map(([type, typeIssues]) => {
            if (typeIssues.length === 0) return null;

            const { label, icon } = issueTypeLabels[type];

            return (
              <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium text-sm text-gray-700">
                      {label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {typeIssues.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {typeIssues.map((issue) => {
                    const segment = segments.find((s) => s.id === issue.segmentId);
                    if (!segment) return null;

                    return (
                      <Button
                        key={`${issue.segmentId}-${issue.type}`}
                        variant="ghost"
                        className="w-full justify-between px-4 py-2 h-auto rounded-none hover:bg-gray-50"
                        onClick={() => onIssueClick(issue.segmentId)}
                      >
                        <div className="flex items-center gap-3 text-left min-w-0">
                          <span className="text-xs text-gray-400 font-mono shrink-0">
                            {formatSubtitleTime(segment.start_time)}
                          </span>
                          <span className="text-sm text-gray-700 truncate">
                            {segment.text || '(빈 텍스트)'}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export the quality check function for use in other components
export function checkSubtitleQuality(segments: SubtitleSegment[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  segments.forEach((segment, index) => {
    if (
      segment.confidence !== null &&
      segment.confidence < QUALITY_THRESHOLDS.MIN_CONFIDENCE
    ) {
      issues.push({
        segmentId: segment.id,
        type: 'low_confidence',
        message: `낮은 신뢰도 (${Math.round(segment.confidence * 100)}%)`,
        severity: segment.confidence < 0.5 ? 'error' : 'warning',
      });
    }

    if (!segment.text.trim()) {
      issues.push({
        segmentId: segment.id,
        type: 'empty',
        message: '빈 텍스트',
        severity: 'error',
      });
    }

    const duration = segment.end_time - segment.start_time;

    if (duration > QUALITY_THRESHOLDS.MAX_SEGMENT_DURATION) {
      issues.push({
        segmentId: segment.id,
        type: 'too_long',
        message: `너무 긴 세그먼트 (${duration.toFixed(1)}초)`,
        severity: 'warning',
      });
    }

    if (duration < QUALITY_THRESHOLDS.MIN_SEGMENT_DURATION) {
      issues.push({
        segmentId: segment.id,
        type: 'too_short',
        message: `너무 짧은 세그먼트 (${duration.toFixed(2)}초)`,
        severity: 'warning',
      });
    }

    if (index < segments.length - 1) {
      const nextSegment = segments[index + 1];
      if (segment.end_time > nextSegment.start_time) {
        issues.push({
          segmentId: segment.id,
          type: 'overlap',
          message: '다음 세그먼트와 시간 겹침',
          severity: 'error',
        });
      }
    }
  });

  return issues;
}
