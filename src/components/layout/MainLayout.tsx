'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
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

export function MainLayout({ children, user, sidebarConfig, showBreadcrumb = true }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 실시간 알림 구독
  useRealtimeNotifications({
    userId: user.id,
    enabled: !!user.id,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} sidebarConfig={sidebarConfig} />

      <div className="lg:pl-64">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 sm:p-6 lg:p-8">
          {showBreadcrumb && (
            <div className="mb-4">
              <Breadcrumb />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
