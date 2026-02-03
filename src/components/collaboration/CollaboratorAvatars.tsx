'use client';

/**
 * 협업자 아바타 목록 컴포넌트
 *
 * 현재 보드를 보고 있는 사용자 목록 표시
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type CollaboratorState } from '@/lib/collaboration/SupabaseProvider';
import { cn } from '@/lib/utils';

interface CollaboratorAvatarsProps {
  collaborators: CollaboratorState[];
  maxVisible?: number;
  className?: string;
}

export function CollaboratorAvatars({
  collaborators,
  maxVisible = 5,
  className,
}: CollaboratorAvatarsProps) {
  const t = useTranslations('collaboration');
  const [mounted, setMounted] = useState(false);

  // Hydration 에러 방지 (Tooltip은 Radix UI)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (collaborators.length === 0) return null;

  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const remainingCount = collaborators.length - maxVisible;

  // 서버 렌더링 시에는 단순 아바타만 표시
  if (!mounted) {
    return (
      <div className={cn('flex -space-x-2', className)}>
        {visibleCollaborators.map((collab) => (
          <div key={collab.user.id} className="relative">
            <Avatar
              className="h-8 w-8 border-2 bg-white"
              style={{ borderColor: collab.user.color }}
            >
              {collab.user.avatar && (
                <AvatarImage src={collab.user.avatar} alt={collab.user.name} />
              )}
              <AvatarFallback
                className="text-xs font-medium text-white"
                style={{ backgroundColor: collab.user.color }}
              >
                {getInitials(collab.user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex -space-x-2', className)}>
        {visibleCollaborators.map((collab) => (
          <Tooltip key={collab.user.id}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar
                  className="h-8 w-8 border-2 bg-white"
                  style={{ borderColor: collab.user.color }}
                >
                  {collab.user.avatar && (
                    <AvatarImage src={collab.user.avatar} alt={collab.user.name} />
                  )}
                  <AvatarFallback
                    className="text-xs font-medium text-white"
                    style={{ backgroundColor: collab.user.color }}
                  >
                    {getInitials(collab.user.name)}
                  </AvatarFallback>
                </Avatar>

                {/* 활동 표시 (커서가 있으면 활성 상태) */}
                {collab.cursor && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white animate-pulse"
                    style={{ backgroundColor: collab.user.color }}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{collab.user.name}</p>
              <p className="text-xs text-gray-400">
                {collab.cursor ? t('editing') : t('viewing')}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* 추가 인원 표시 */}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>+{remainingCount}</p>
              <ul className="mt-1 text-xs text-gray-400">
                {collaborators.slice(maxVisible).map((collab) => (
                  <li key={collab.user.id}>{collab.user.name}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * 연결 상태 표시 컴포넌트
 */
interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected';
  className?: string;
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const t = useTranslations('collaboration');

  const statusConfig = {
    connecting: {
      labelKey: 'connecting' as const,
      color: 'bg-yellow-400',
      animate: true,
    },
    connected: {
      labelKey: 'connected' as const,
      color: 'bg-green-500',
      animate: false,
    },
    disconnected: {
      labelKey: 'disconnected' as const,
      color: 'bg-red-500',
      animate: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          config.color,
          config.animate && 'animate-pulse'
        )}
      />
      <span className="text-gray-500">{t(config.labelKey)}</span>
    </div>
  );
}

/**
 * 이름에서 이니셜 추출
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
