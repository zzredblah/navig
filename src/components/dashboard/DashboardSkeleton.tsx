import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 인사 헤더 스켈레톤 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>

      {/* 통계 카드 스켈레톤 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 차트 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 활동 피드 스켈레톤 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-3 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
