'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { GlobalHotkeysProvider } from '@/components/providers/GlobalHotkeysProvider';
import { InstallPrompt, IOSInstallGuide, UpdateNotification } from '@/components/pwa';
import type { SidebarConfig } from '@/types/database';

interface MainLayoutProps {
  children: React.ReactNode;
  user: {
    id?: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  sidebarConfig?: SidebarConfig | null;
  showBreadcrumb?: boolean;
}

// 브레드크럼을 숨겨야 하는 경로 패턴 (전체 화면 모드가 필요한 페이지)
const HIDE_BREADCRUMB_PATTERNS = [
  /^\/projects\/[^/]+\/boards\/[^/]+$/, // 보드 상세 페이지
  /^\/projects\/[^/]+\/videos\/[^/]+\/compare$/, // 영상 비교 페이지
];

export function MainLayout({ children, user, sidebarConfig, showBreadcrumb = true }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // 특정 경로에서는 브레드크럼 자동 숨김
  const shouldHideBreadcrumb = HIDE_BREADCRUMB_PATTERNS.some(pattern => pattern.test(pathname));

  // 실시간 알림 구독
  useRealtimeNotifications({
    userId: user.id,
    enabled: !!user.id,
  });

  return (
    <GlobalHotkeysProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} sidebarConfig={sidebarConfig} />

        <div className="lg:pl-64">
          <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

          <main className="p-4 sm:p-6 lg:p-8">
            {showBreadcrumb && !shouldHideBreadcrumb && (
              <div className="mb-4">
                <Breadcrumb />
              </div>
            )}
            {children}
          </main>
        </div>

        {/* PWA Install & Update Prompts */}
        <InstallPrompt />
        <IOSInstallGuide />
        <UpdateNotification />
      </div>
    </GlobalHotkeysProvider>
  );
}
