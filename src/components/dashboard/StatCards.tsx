'use client';

import Link from 'next/link';
import { FolderOpen, FolderKanban, Video, CheckCircle, Users, FileText, Play, TrendingUp } from 'lucide-react';

interface StatCardsProps {
  total: number;
  planning: number;
  production: number;
  review: number;
  completed: number;
  totalMembers?: number;
  totalDocuments?: number;
}

export function StatCards({
  total,
  planning,
  production,
  review,
  completed,
  totalMembers = 0,
  totalDocuments = 0,
}: StatCardsProps) {
  const activeProjects = planning + production + review;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 상단: 전체 프로젝트 요약 */}
      <div className="px-5 py-4 bg-gradient-to-r from-primary-50 via-white to-purple-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{total}</span>
                <span className="text-sm text-gray-500">프로젝트</span>
              </div>
              <p className="text-xs text-gray-400">
                진행 중 {activeProjects}개 · 완료 {completed}개
              </p>
            </div>
          </div>
          <Link
            href="/projects"
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>
      </div>

      {/* 하단: 상세 통계 그리드 - 7열 균등 배치 */}
      <div className="grid grid-cols-4 sm:grid-cols-7 divide-x divide-gray-100">
        {/* 프로젝트 상태 */}
        <Link
          href="/projects?status=planning"
          className="p-3 hover:bg-violet-50/50 transition-colors text-center"
        >
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center mx-auto mb-1.5">
            <FolderKanban className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{planning}</div>
          <p className="text-[10px] text-gray-500">기획</p>
        </Link>

        <Link
          href="/projects?status=production"
          className="p-3 hover:bg-purple-50/50 transition-colors text-center"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-1.5">
            <Video className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{production}</div>
          <p className="text-[10px] text-gray-500">제작</p>
        </Link>

        <Link
          href="/projects?status=review"
          className="p-3 hover:bg-blue-50/50 transition-colors text-center"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{review}</div>
          <p className="text-[10px] text-gray-500">검수</p>
        </Link>

        <Link
          href="/projects?status=completed"
          className="p-3 hover:bg-green-50/50 transition-colors text-center"
        >
          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{completed}</div>
          <p className="text-[10px] text-gray-500">완료</p>
        </Link>

        {/* 진행 중 - 모바일에서는 다음 줄 */}
        <Link
          href="/projects"
          className="p-3 hover:bg-primary-50/50 transition-colors text-center border-t sm:border-t-0 border-gray-100"
        >
          <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center mx-auto mb-1.5">
            <Play className="h-3.5 w-3.5 text-primary-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{activeProjects}</div>
          <p className="text-[10px] text-gray-500">진행 중</p>
        </Link>

        {/* 협업 멤버 */}
        <div className="p-3 text-center border-t sm:border-t-0 border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center mx-auto mb-1.5">
            <Users className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{totalMembers}</div>
          <p className="text-[10px] text-gray-500">협업 멤버</p>
        </div>

        {/* 전체 문서 */}
        <div className="p-3 text-center col-span-2 sm:col-span-1 border-t sm:border-t-0 border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center mx-auto mb-1.5">
            <FileText className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{totalDocuments}</div>
          <p className="text-[10px] text-gray-500">전체 문서</p>
        </div>
      </div>
    </div>
  );
}
