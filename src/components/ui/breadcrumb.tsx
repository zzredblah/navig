'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// 경로별 한글 라벨 매핑
const pathLabels: Record<string, string> = {
  dashboard: '대시보드',
  projects: '프로젝트',
  documents: '문서',
  team: '팀 멤버',
  trash: '휴지통',
  profile: '프로필',
  settings: '설정',
  subscription: '구독 관리',
  new: '새로 만들기',
  edit: '수정',
  members: '멤버',
  videos: '영상',
  feedbacks: '피드백',
  compare: '버전 비교',
  boards: '레퍼런스 보드',
  analytics: '분석',
  community: '커뮤니티',
  timeline: '타임라인',
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  separator?: React.ReactNode;
}

function Breadcrumb({
  items,
  showHome = true,
  separator,
  className,
  ...props
}: BreadcrumbProps) {
  const pathname = usePathname();

  // items가 제공되지 않으면 현재 경로에서 자동 생성
  const breadcrumbItems = React.useMemo(() => {
    if (items) return items;

    const paths = pathname.split('/').filter(Boolean);
    const generatedItems: BreadcrumbItem[] = [];

    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;

      // UUID인 경우 건너뛰기 (상세 페이지의 ID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path);

      if (!isUuid) {
        const label = pathLabels[path] || path.charAt(0).toUpperCase() + path.slice(1);
        generatedItems.push({
          label,
          // 마지막 항목은 링크 없음
          href: index < paths.length - 1 ? currentPath : undefined,
        });
      } else {
        // UUID가 있으면 "상세" 항목 추가 (해당 경로로 링크)
        if (generatedItems.length > 0) {
          const lastItem = generatedItems[generatedItems.length - 1];
          // 이전 항목의 링크는 그대로 유지
          generatedItems[generatedItems.length - 1] = {
            ...lastItem,
            href: lastItem.href,
          };
          // "상세"는 UUID 경로로 링크 (마지막이 아닐 때만)
          generatedItems.push({
            label: '상세',
            href: index < paths.length - 1 ? currentPath : undefined,
          });
        }
      }
    });

    return generatedItems;
  }, [items, pathname]);

  const defaultSeparator = (
    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
  );

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
      {...props}
    >
      <ol className="flex items-center gap-1.5">
        {showHome && (
          <>
            <li>
              <Link
                href="/dashboard"
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">홈</span>
              </Link>
            </li>
            {breadcrumbItems.length > 0 && (
              <li className="flex items-center">
                {separator || defaultSeparator}
              </li>
            )}
          </>
        )}
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <li>
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{item.label}</span>
              )}
            </li>
            {index < breadcrumbItems.length - 1 && (
              <li className="flex items-center">
                {separator || defaultSeparator}
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

// BreadcrumbItem 컴포넌트 (수동으로 사용할 때)
interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {
  href?: string;
  isCurrentPage?: boolean;
}

function BreadcrumbItemComponent({
  href,
  isCurrentPage,
  children,
  className,
  ...props
}: BreadcrumbItemProps) {
  return (
    <li
      className={cn('flex items-center', className)}
      aria-current={isCurrentPage ? 'page' : undefined}
      {...props}
    >
      {href && !isCurrentPage ? (
        <Link
          href={href}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {children}
        </Link>
      ) : (
        <span className={cn(isCurrentPage && 'text-gray-900 font-medium')}>
          {children}
        </span>
      )}
    </li>
  );
}

// BreadcrumbSeparator 컴포넌트
function BreadcrumbSeparator({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn('flex items-center', className)} role="presentation">
      {children || <ChevronRight className="h-4 w-4 text-gray-400" />}
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbItemComponent as BreadcrumbItem,
  BreadcrumbSeparator,
};
