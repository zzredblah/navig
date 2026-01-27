'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut, User, Settings, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useChatUnread } from '@/hooks/use-chat-unread';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  onMenuClick?: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': '대시보드',
  '/projects': '프로젝트',
  '/documents': '문서',
  '/team': '팀 멤버',
  '/settings': '설정',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/projects/')) return '프로젝트';
  if (pathname.startsWith('/documents/')) return '문서';
  return '';
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { unreadCount } = useChatUnread();
  const pageTitle = getPageTitle(pathname);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">메뉴 열기</span>
          </Button>
          {/* 모바일에서만 로고 표시 (데스크톱은 사이드바에 로고 있음) */}
          <Link href="/dashboard" className="flex items-center lg:hidden">
            <Image
              src="/images/logo-light.png"
              alt="NAVIG"
              width={100}
              height={32}
              className="h-7 w-auto object-contain"
              priority
              unoptimized
            />
          </Link>
          {pageTitle && (
            <h2 className="hidden lg:block text-lg font-semibold text-gray-900">{pageTitle}</h2>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 채팅 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => setIsChatOpen(true)}
          >
            <MessageSquare className="h-5 w-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 bg-primary-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="sr-only">채팅 열기</span>
          </Button>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                  <AvatarFallback className="bg-primary-100 text-primary-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  프로필
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  설정
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-error-600 focus:text-error-600"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 채팅 패널 */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </header>
  );
}
