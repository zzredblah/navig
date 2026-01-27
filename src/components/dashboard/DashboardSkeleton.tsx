import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* 인사 헤더 스켈레톤 */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-56 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* 통계 카드 스켈레톤 - StatCards와 동일 구조 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* 상단: 전체 프로젝트 요약 */}
        <div className="px-5 py-4 bg-gradient-to-r from-primary-50 via-white to-purple-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div>
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-7 w-8" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-3 w-28 mt-1" />
              </div>
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* 하단: 상세 통계 그리드 - 7열 */}
        <div className="grid grid-cols-4 sm:grid-cols-7 divide-x divide-gray-100">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className={`p-3 text-center ${i > 4 ? 'border-t sm:border-t-0 border-gray-100' : ''} ${i === 7 ? 'col-span-2 sm:col-span-1' : ''}`}>
              <Skeleton className="w-7 h-7 rounded-lg mx-auto mb-1.5" />
              <Skeleton className="h-5 w-6 mx-auto mb-1" />
              <Skeleton className="h-2.5 w-8 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* 차트 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 긴급 섹션 + 최근 활동 스켈레톤 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 긴급 섹션 - 접힌 상태 (기본) */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="w-4 h-4" />
          </div>
        </div>

        {/* 최근 활동 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 최근 프로젝트 스켈레톤 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full mb-3" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
