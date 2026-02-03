'use client';

/**
 * 협업자 커서 컴포넌트
 *
 * 다른 사용자의 커서를 캔버스에 표시
 *
 * Note: position은 이미 화면 좌표로 변환된 값이어야 함 (zoom, pan 적용 완료)
 */

import { useState, useEffect } from 'react';
import { useSmoothCursor } from '@/hooks/use-collaboration';
import { cn } from '@/lib/utils';

interface CollaboratorCursorProps {
  position: { x: number; y: number };
  user: {
    name: string;
    color: string;
  };
  scale?: number; // 더 이상 사용 안 함 (하위 호환성 유지)
  /** 비활성 후 페이드아웃 시간 (ms), 0이면 비활성화 */
  fadeOutDelay?: number;
}

export function CollaboratorCursor({
  position,
  user,
  fadeOutDelay = 3000,
}: CollaboratorCursorProps) {
  // 부드러운 커서 이동
  const smoothPosition = useSmoothCursor(position);
  const [isActive, setIsActive] = useState(true);

  // 커서 페이드아웃: 일정 시간 움직임이 없으면 투명도 감소
  useEffect(() => {
    if (fadeOutDelay <= 0) return;

    setIsActive(true);
    const timer = setTimeout(() => {
      setIsActive(false);
    }, fadeOutDelay);

    return () => clearTimeout(timer);
  }, [position.x, position.y, fadeOutDelay]);

  if (!smoothPosition) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-50 transition-opacity duration-500',
        isActive ? 'opacity-100' : 'opacity-40'
      )}
      style={{
        left: smoothPosition.x,
        top: smoothPosition.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* 커서 아이콘 */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z"
          fill={user.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* 사용자 이름 라벨 */}
      <div
        className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </div>
  );
}

/**
 * Konva 캔버스용 협업자 커서 (React-Konva)
 *
 * <Stage> 내에서 사용
 */
export function KonvaCollaboratorCursor({
  position,
  user,
}: CollaboratorCursorProps) {
  const smoothPosition = useSmoothCursor(position);

  if (!smoothPosition) return null;

  // Note: 실제 Konva 구현 시 react-konva의 Group, Path, Text 등 사용
  // 이 컴포넌트는 HTML overlay로 대체 사용 가능
  return null;
}
