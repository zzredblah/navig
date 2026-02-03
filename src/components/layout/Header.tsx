'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut, User, Settings, MessageSquare, Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
import { AIChatbotPanel } from '@/components/chat/AIChatbotPanel';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { clearAllAppData } from '@/stores/project-context-store';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  onMenuClick?: () => void;
}

// 페이지 경로 -> 번역 키 매핑
const pageTranslationKeys: Record<string, string> = {
  '/dashboard': 'navigation.dashboard',
  '/projects': 'navigation.projects',
  '/documents': 'documents.title',
  '/videos': 'videos.title',
  '/boards': 'board.title',
  '/team': 'projects.members',
  '/notifications': 'navigation.notifications',
  '/settings': 'navigation.settings',
  '/help': 'navigation.help',
  '/community': 'navigation.community',
  '/analytics': 'navigation.analytics',
};

function getPageTranslationKey(pathname: string): string | null {
  // 정확한 경로 매칭
  if (pageTranslationKeys[pathname]) return pageTranslationKeys[pathname];

  // 프로젝트 내 페이지 감지 (더 구체적인 패턴 먼저)
  if (pathname.match(/\/projects\/[^/]+\/videos/)) return 'videos.title';
  if (pathname.match(/\/projects\/[^/]+\/documents/)) return 'documents.title';
  if (pathname.match(/\/projects\/[^/]+\/boards/)) return 'board.title';
  if (pathname.match(/\/projects\/[^/]+\/members/)) return 'projects.members';
  if (pathname.match(/\/projects\/[^/]+\/settings/)) return 'projects.settings';
  if (pathname.match(/\/projects\/[^/]+\/timeline/)) return 'projects.timeline';
  if (pathname.match(/\/projects\/[^/]+\/chat/)) return 'projects.chat';

  // 프로젝트 홈 (정확히 /projects/{id} 또는 /projects/{id}/)
  if (pathname.match(/\/projects\/[^/]+\/?$/)) return 'projects.title';

  // 일반 경로
  if (pathname.startsWith('/documents/')) return 'documents.title';
  if (pathname.startsWith('/videos/')) return 'videos.title';
  if (pathname.startsWith('/boards/')) return 'board.title';
  if (pathname.startsWith('/settings/')) return 'navigation.settings';
  if (pathname.startsWith('/community/')) return 'navigation.community';
  if (pathname.startsWith('/analytics/')) return 'navigation.analytics';

  return null;
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tNav = useTranslations('navigation');
  const tAI = useTranslations('ai');

  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const { unreadCount } = useChatUnread();

  // Hydration 에러 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  // 페이지 타이틀 가져오기
  const pageTranslationKey = getPageTranslationKey(pathname);
  const pageTitle = pageTranslationKey ? t(pageTranslationKey) : '';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 먼저 로컬 데이터 클리어 (프로젝트 컨텍스트, localStorage 등)
      clearAllAppData();

      // 서버에 로그아웃 요청
      await fetch('/api/auth/logout', { method: 'POST' });

      // 로그인 페이지로 리다이렉트
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
          {/* 언어 전환 */}
          <LanguageSwitcher variant="icon" />

          {/* AI 챗봇 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => setIsAIOpen(true)}
            title={tAI('assistant')}
          >
            <Bot className="h-5 w-5 text-blue-500" />
            <span className="sr-only">{tAI('assistant')}</span>
          </Button>

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

          {/* 프로필 드롭다운 - Hydration 에러 방지 */}
          {mounted ? (
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
                    {tNav('profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {tNav('settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-error-600 focus:text-error-600"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? `${tAuth('logout')}...` : tAuth('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary-100 text-primary-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          )}
        </div>
      </div>

      {/* 채팅 패널 */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* AI 챗봇 패널 */}
      <AIChatbotPanel isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </header>
  );
}
