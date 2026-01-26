'use client';

/**
 * 채팅 전용 레이아웃
 * - 브레드크럼 숨김
 * - 패딩 제거
 * - 전체 높이 사용
 */

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="fixed inset-0 lg:left-64 top-16 bg-white overflow-hidden">
      {children}
    </div>
  );
}
