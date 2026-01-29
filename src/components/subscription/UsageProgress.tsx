'use client';

import { FolderOpen, HardDrive, Users, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { UsageSummary } from '@/types/subscription';

interface UsageProgressProps {
  usage: UsageSummary;
  compact?: boolean;
}

interface UsageItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  current: number | string;
  limit: number | string;
  percentage: number;
  unit?: string;
}

function UsageItem({ icon, iconBg, label, current, limit, percentage, unit }: UsageItemProps) {
  const isUnlimited = limit === Infinity || limit === -1 || limit === '무제한';
  const isWarning = percentage >= 80 && percentage < 100;
  const isExceeded = percentage >= 100;

  const getProgressColor = () => {
    if (isExceeded) return 'from-red-500 to-red-600';
    if (isWarning) return 'from-orange-400 to-orange-500';
    return 'from-primary-400 to-primary-600';
  };

  const getTextColor = () => {
    if (isExceeded) return 'text-red-600';
    if (isWarning) return 'text-orange-600';
    return 'text-gray-900';
  };

  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
            {icon}
          </div>
          <div>
            <p className="font-medium text-gray-900">{label}</p>
            <p className={cn('text-sm font-semibold', getTextColor())}>
              {current}{unit && ` ${unit}`}
              <span className="text-gray-400 font-normal">
                {' / '}
                {isUnlimited ? '무제한' : `${limit}${unit ? ` ${unit}` : ''}`}
              </span>
            </p>
          </div>
        </div>

        {!isUnlimited && (
          <div className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold',
            isExceeded ? 'bg-red-100 text-red-700' :
            isWarning ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-600'
          )}>
            {percentage}%
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isUnlimited && (
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-all duration-500',
              getProgressColor()
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      {isUnlimited && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Zap className="h-3 w-3 text-primary-500" />
          무제한 사용 가능
        </div>
      )}

      {/* 경고 메시지 */}
      {isWarning && !isExceeded && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600">
          <TrendingUp className="h-3 w-3" />
          제한에 가까워지고 있습니다
        </div>
      )}
      {isExceeded && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          제한을 초과했습니다
        </div>
      )}
    </div>
  );
}

export function UsageProgress({ usage, compact }: UsageProgressProps) {
  // 가장 높은 사용률 계산
  const maxPercentage = Math.max(
    usage.projects_percentage,
    usage.storage_percentage,
    usage.members_limit === Infinity ? 0 : Math.round((usage.members_count / usage.members_limit) * 100)
  );
  const isNearLimit = maxPercentage >= 80;

  if (compact) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">사용량 요약</h3>
          {isNearLimit && (
            <span className="text-xs text-orange-600 font-medium">{maxPercentage}% 사용 중</span>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-all',
              maxPercentage >= 100 ? 'from-red-500 to-red-600' :
              maxPercentage >= 80 ? 'from-orange-400 to-orange-500' :
              'from-primary-400 to-primary-600'
            )}
            style={{ width: `${Math.min(maxPercentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">사용량 현황</h3>
            <p className="text-sm text-gray-500">현재 플랜의 리소스 사용 현황입니다</p>
          </div>
          {isNearLimit && (
            <Link href="/pricing">
              <Button size="sm" className="bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600">
                <Zap className="h-4 w-4 mr-1.5" />
                업그레이드
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 사용량 그리드 */}
      <div className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <UsageItem
            icon={<FolderOpen className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-100"
            label="프로젝트"
            current={usage.projects_count}
            limit={usage.projects_limit}
            percentage={usage.projects_percentage}
            unit="개"
          />

          <UsageItem
            icon={<HardDrive className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-100"
            label="스토리지"
            current={usage.storage_used_gb.toFixed(2)}
            limit={usage.storage_limit_gb}
            percentage={usage.storage_percentage}
            unit="GB"
          />

          <UsageItem
            icon={<Users className="h-5 w-5 text-green-600" />}
            iconBg="bg-green-100"
            label="초대한 멤버"
            current={usage.members_count}
            limit={usage.members_limit}
            percentage={
              usage.members_limit === Infinity
                ? 0
                : Math.round((usage.members_count / usage.members_limit) * 100)
            }
            unit="명"
          />
        </div>
      </div>
    </div>
  );
}
