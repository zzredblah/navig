'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  Trash2,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SidebarConfig } from '@/types/database';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  sidebarConfig?: SidebarConfig | null;
}

const menuItems = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '프로젝트',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    title: '문서',
    href: '/documents',
    icon: FileText,
  },
  {
    title: '팀 멤버',
    href: '/team',
    icon: Users,
  },
];

const bottomMenuItems = [
  {
    title: '휴지통',
    href: '/documents/trash',
    icon: Trash2,
  },
  {
    title: '설정',
    href: '/settings',
    icon: Settings,
  },
  {
    title: '도움말',
    href: '/help',
    icon: HelpCircle,
  },
];

// Items that cannot be hidden
const ALWAYS_VISIBLE = ['/dashboard', '/settings'];

export function Sidebar({ isOpen, onClose, sidebarConfig }: SidebarProps) {
  const pathname = usePathname();
  const hiddenItems = sidebarConfig?.hidden || [];

  const filteredMenuItems = menuItems.filter(
    (item) => ALWAYS_VISIBLE.includes(item.href) || !hiddenItems.includes(item.href)
  );
  const filteredBottomMenuItems = bottomMenuItems.filter(
    (item) => ALWAYS_VISIBLE.includes(item.href) || !hiddenItems.includes(item.href)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/images/logo-light.png"
                alt="NAVIG"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* NAVIGation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Bottom navigation */}
          <div className="p-4 border-t border-gray-200 space-y-1">
            {filteredBottomMenuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
