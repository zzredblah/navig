'use client';

import type { TextOverlay } from '@/types/editing';

interface TextOverlayRendererProps {
  overlays: TextOverlay[];
  currentTime: number;
}

export function TextOverlayRenderer({
  overlays,
  currentTime,
}: TextOverlayRendererProps) {
  // 현재 시간에 표시해야 할 오버레이 필터링
  const visibleOverlays = overlays.filter(
    (overlay) => currentTime >= overlay.startTime && currentTime <= overlay.endTime
  );

  if (visibleOverlays.length === 0) {
    return null;
  }

  // 자막 오버레이(subtitle- 접두사)가 겹칠 경우 가장 최근 시작된 것만 표시
  const subtitleOverlays = visibleOverlays.filter(o => o.id.startsWith('subtitle-'));
  const otherOverlays = visibleOverlays.filter(o => !o.id.startsWith('subtitle-'));

  // 자막이 여러 개면 현재 시간과 가장 가까운 시작 시간을 가진 것 선택
  let selectedSubtitle: TextOverlay | null = null;
  if (subtitleOverlays.length > 0) {
    // 현재 시간 이전에 시작된 것 중 가장 늦게 시작된 것 선택
    selectedSubtitle = subtitleOverlays.reduce((best, current) => {
      if (!best) return current;
      // 현재 시간에 더 가까운 시작 시간을 가진 것 선택
      return current.startTime > best.startTime ? current : best;
    }, null as TextOverlay | null);
  }

  // 최종 표시할 오버레이: 일반 오버레이 + 선택된 자막 1개
  const finalOverlays = selectedSubtitle
    ? [...otherOverlays, selectedSubtitle]
    : otherOverlays;

  if (finalOverlays.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {finalOverlays.map((overlay) => (
        <div
          key={overlay.id}
          className="absolute whitespace-pre-wrap"
          style={{
            left: `${overlay.position.x}%`,
            top: `${overlay.position.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${overlay.style.fontSize}px`,
            color: overlay.style.color,
            backgroundColor: overlay.style.backgroundColor || 'transparent',
            fontWeight: overlay.style.fontWeight || 'normal',
            fontFamily: overlay.style.fontFamily || 'inherit',
            padding: overlay.style.backgroundColor ? '4px 8px' : '0',
            borderRadius: overlay.style.backgroundColor ? '4px' : '0',
            textShadow: !overlay.style.backgroundColor
              ? '0 1px 2px rgba(0,0,0,0.8)'
              : 'none',
          }}
        >
          {overlay.text}
        </div>
      ))}
    </div>
  );
}
