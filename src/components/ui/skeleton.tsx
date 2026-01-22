import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 스켈레톤의 모양
   * - default: 기본 직사각형
   * - circle: 원형 (아바타 등)
   * - text: 텍스트 라인
   */
  variant?: 'default' | 'circle' | 'text';
}

function Skeleton({
  className,
  variant = 'default',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        {
          'rounded-md': variant === 'default',
          'rounded-full': variant === 'circle',
          'rounded h-4': variant === 'text',
        },
        className
      )}
      {...props}
    />
  );
}

// 카드 스켈레톤
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        className
      )}
    >
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Skeleton variant="circle" className="h-8 w-8" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// 테이블 행 스켈레톤
function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// 아바타 스켈레톤
function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton variant="circle" className={sizeClasses[size]} />;
}

// 버튼 스켈레톤
function SkeletonButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return <Skeleton className={cn('rounded-md', sizeClasses[size])} />;
}

// 입력 필드 스켈레톤
function SkeletonInput() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// 프로젝트 카드 그리드 스켈레톤
function SkeletonProjectGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// 리스트 스켈레톤
function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
          <Skeleton variant="circle" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 대시보드 통계 카드 스켈레톤
function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton variant="circle" className="h-8 w-8" />
      </div>
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonInput,
  SkeletonProjectGrid,
  SkeletonList,
  SkeletonStatCard,
};
