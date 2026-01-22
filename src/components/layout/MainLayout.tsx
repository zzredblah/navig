'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface MainLayoutProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  showBreadcrumb?: boolean;
}

export function MainLayout({ children, user, showBreadcrumb = true }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
